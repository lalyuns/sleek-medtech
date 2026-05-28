import hashlib
import io
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from rq.job import Job
from sqlalchemy.orm import Session
from typing import Optional

import redis as redis_lib

from app.config import settings
from app.database import get_db
from app.dependencies.rbac import require_project_access
from app.models.material import Material
from app.models.model_version import ModelVersion, VersionStatus
from app.models.reference_edge import ReferenceEdge, TargetType
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.services.events import record_event
from app.storage import minio_client, ensure_bucket, BUCKET
from app.tasks import enqueue_process_upload

router = APIRouter(prefix="/api/v1/projects", tags=["upload"])
redis_client = redis_lib.from_url(settings.REDIS_URL)


def _get_version_or_404(version_id: int, project_id: int, db: Session) -> ModelVersion:
    v = db.query(ModelVersion).filter(
        ModelVersion.version_id == version_id,
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return v


# Create an uploading version record before receiving STL chunks.
@router.post("/{project_id}/versions/upload/init", status_code=status.HTTP_201_CREATED)
def init_upload(
    project_id: int,
    material_id: int = Form(...),
    total_chunks: int = Form(...),
    hash_value: str = Form(...),
    description: Optional[str] = Form(None),
    parent_version_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.edit)),
):
    material = db.query(Material).filter(Material.material_id == material_id, Material.is_active == True).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found or inactive")
    if parent_version_id is not None:
        _get_version_or_404(parent_version_id, project_id, db)

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
    db.flush()
    if parent_version_id is not None:
        db.add(ReferenceEdge(
            source_version_id=version.version_id,
            target_type=TargetType.old_version,
            target_id=parent_version_id,
        ))
    record_event(
        db,
        project_id=project_id,
        actor_id=current_user.user_id,
        event_type="file.upload_started",
        target_type="model_version",
        target_id=version.version_id,
        summary=f"開始上傳 3D 模型 v{version.version_number}",
        payload_json={
            "hash_value": hash_value,
            "material_id": material_id,
            "parent_version_id": parent_version_id,
        },
    )
    db.commit()
    db.refresh(version)

    ensure_bucket()
    return {"version_id": version.version_id, "total_chunks": total_chunks}


# Store one validated upload chunk in object storage.
@router.post("/{project_id}/versions/{version_id}/upload/chunk", status_code=status.HTTP_204_NO_CONTENT)
def upload_chunk(
    project_id: int,
    version_id: int,
    chunk_index: int = Form(...),
    chunk_md5: Optional[str] = Form(None),
    chunk: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.edit)),
):
    version = _get_version_or_404(version_id, project_id, db)
    if version.status != VersionStatus.uploading:
        raise HTTPException(status_code=400, detail="Version is not in uploading state")

    data = chunk.file.read()
    if chunk_md5:
        actual_md5 = hashlib.md5(data).hexdigest()
        if actual_md5.lower() != chunk_md5.lower():
            raise HTTPException(status_code=400, detail="Chunk MD5 mismatch")

    object_name = f"tmp/{version_id}/{chunk_index:05d}"
    minio_client.put_object(BUCKET, object_name, io.BytesIO(data), length=len(data))


# Verify chunk completeness and enqueue the asynchronous STL worker.
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


@router.get("/{project_id}/versions/{version_id}/upload/status/{job_id}")
def upload_status(
    project_id: int,
    version_id: int,
    job_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    version = _get_version_or_404(version_id, project_id, db)
    try:
        job = Job.fetch(job_id, connection=redis_client)
        rq_status = job.get_status(refresh=True)
    except Exception:
        raise HTTPException(status_code=404, detail="Upload job not found")

    if version.status == VersionStatus.draft and rq_status == "finished":
        status_value = "DONE"
        progress = 100
    elif job.is_failed:
        status_value = "FAILED"
        progress = 100
    elif job.meta.get("status"):
        status_value = job.meta.get("status")
        progress = int(job.meta.get("progress", 50))
    elif rq_status in ("queued", "deferred"):
        status_value = "QUEUED"
        progress = 10
    else:
        status_value = "PROCESSING"
        progress = 50

    return {
        "job_id": job_id,
        "version_id": version_id,
        "status": status_value,
        "progress": progress,
        "message": job.meta.get("message", ""),
    }
