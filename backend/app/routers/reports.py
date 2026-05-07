from datetime import datetime
import io
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.rbac import require_project_access
from app.models.reference_edge import ReferenceEdge, TargetType
from app.models.report import Report
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.schemas.report import ReportOut
from app.storage import BUCKET, ensure_bucket, minio_client, public_object_url, signed_object_url

router = APIRouter(prefix="/api/v1/projects", tags=["reports"])


@router.get("/{project_id}/reports", response_model=List[ReportOut])
def list_reports(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    return db.query(Report).filter(
        Report.project_id == project_id,
        Report.is_deleted == False,
    ).order_by(Report.created_at.desc()).all()


@router.post("/{project_id}/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def upload_report(
    project_id: int,
    name: str = Form(...),
    report_type: str = Form("material_test"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.edit)),
):
    ensure_bucket()
    data = file.file.read()
    safe_name = file.filename.replace("\\", "_").replace("/", "_") if file.filename else "report.bin"
    object_name = f"reports/{project_id}/{uuid4()}-{safe_name}"
    minio_client.put_object(
        BUCKET,
        object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=file.content_type or "application/octet-stream",
    )

    report = Report(
        project_id=project_id,
        uploader_id=current_user.user_id,
        name=name,
        report_type=report_type,
        file_url=public_object_url(object_name),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{project_id}/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    project_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.edit)),
):
    report = db.query(Report).filter(
        Report.report_id == report_id,
        Report.project_id == project_id,
        Report.is_deleted == False,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.is_deleted = True
    report.deleted_at = datetime.utcnow()
    db.query(ReferenceEdge).filter(
        ReferenceEdge.target_type == TargetType.report,
        ReferenceEdge.target_id == report_id,
    ).delete(synchronize_session=False)
    db.commit()


@router.get("/{project_id}/reports/{report_id}/file-url")
def get_report_file_url(
    project_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    report = db.query(Report).filter(
        Report.report_id == report_id,
        Report.project_id == project_id,
        Report.is_deleted == False,
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    signed, expires_in, mode = signed_object_url(report.file_url)
    return {"file_url": signed, "expires_in": expires_in, "mode": mode}
