import hashlib
import io
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_project_access
from app.models.material import Material
from app.models.model_version import ModelVersion, VersionStatus
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.storage import minio_client, ensure_bucket, BUCKET
from app.tasks import enqueue_process_upload

router = APIRouter(prefix="/api/v1/projects", tags=["upload"])


def _get_version_or_404(version_id: int, project_id: int, db: Session) -> ModelVersion:
    v = db.query(ModelVersion).filter(
        ModelVersion.version_id == version_id,
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return v


# D1 — Initiate upload
@router.post("/{project_id}/versions/upload/init", status_code=status.HTTP_201_CREATED)
def init_upload(
    project_id: int,
    material_id: int = Form(...),
    total_chunks: int = Form(...),
    hash_value: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.edit)),
):
    material = db.query(Material).filter(Material.material_id == material_id, Material.is_active == True).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found or inactive")

    last = (
        db.query(ModelVersion.version_number)
        .filter(ModelVersion.project_id == project_id, ModelVersion.is_deleted == False)
        .order_by(ModelVersion.version_number.desc())
        .first()
    )
    next_number = (last[0] + 1) if last else 1

    version = ModelVersion(
        project_id=project_id,
        uploader_id=current_user.user_id,
        material_id=material_id,
        file_url="",
        version_number=next_number,
        description=description,
        hash_value=hash_value,
        total_chunks=total_chunks,
        status=VersionStatus.uploading,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    ensure_bucket()
    return {"version_id": version.version_id, "total_chunks": total_chunks}


# D2 — Upload single chunk
@router.post("/{project_id}/versions/{version_id}/upload/chunk", status_code=status.HTTP_204_NO_CONTENT)
def upload_chunk(
    project_id: int,
    version_id: int,
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.edit)),
):
    version = _get_version_or_404(version_id, project_id, db)
    if version.status != VersionStatus.uploading:
        raise HTTPException(status_code=400, detail="Version is not in uploading state")

    data = chunk.file.read()
    object_name = f"tmp/{version_id}/{chunk_index:05d}"
    minio_client.put_object(BUCKET, object_name, io.BytesIO(data), length=len(data))


# D3 — Complete upload → enqueue worker job
@router.post("/{project_id}/versions/{version_id}/upload/complete")
def complete_upload(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.edit)),
):
    version = _get_version_or_404(version_id, project_id, db)
    if version.status != VersionStatus.uploading:
        raise HTTPException(status_code=400, detail="Version is not in uploading state")

    # Verify all chunks are present in MinIO
    expected = version.total_chunks or 0
    present = sum(
        1 for _ in minio_client.list_objects(BUCKET, prefix=f"tmp/{version_id}/")
    )
    if present != expected:
        raise HTTPException(
            status_code=400,
            detail=f"Chunk count mismatch: expected {expected}, found {present}",
        )

    job_id = enqueue_process_upload(version_id)
    return {"job_id": job_id, "version_id": version_id, "status": "queued"}
