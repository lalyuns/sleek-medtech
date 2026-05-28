from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.rbac import require_project_access
from app.models.comment import Comment
from app.models.event import Event
from app.models.feedback import Feedback
from app.models.model_version import ModelVersion, VersionStatus
from app.models.project_file import ProjectFile
from app.models.report import Report
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.schemas.workspace import ProjectCommentOut, ProjectEventOut, ProjectFileOut

router = APIRouter(prefix="/api/v1/projects", tags=["workspace"])


def _version_file_name(version: ModelVersion) -> str:
    return f"3D model v{version.version_number}"


def _version_file_status(status: VersionStatus) -> str:
    return "signed_off" if status == VersionStatus.locked else status.value


@router.get("/{project_id}/files", response_model=List[ProjectFileOut])
def list_project_files(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    native_files = [
        ProjectFileOut(
            item_id=f"file:{file.file_id}",
            source="project_files",
            source_id=file.file_id,
            project_id=file.project_id,
            uploaded_by=file.uploaded_by,
            file_type=file.file_type.value,
            version_number=file.version_number,
            name=file.name,
            file_url=file.file_url,
            hash_value=file.hash_value,
            metadata_json=file.metadata_json,
            status=file.status.value,
            created_at=file.created_at,
        )
        for file in db.query(ProjectFile).filter(
            ProjectFile.project_id == project_id,
            ProjectFile.is_deleted == False,
        ).all()
    ]

    model_files = [
        ProjectFileOut(
            item_id=f"version:{version.version_id}",
            source="model_versions",
            source_id=version.version_id,
            project_id=version.project_id,
            uploaded_by=version.uploader_id,
            file_type="model",
            version_number=version.version_number,
            name=_version_file_name(version),
            file_url=version.file_url,
            hash_value=version.hash_value,
            metadata_json={
                "legacy_version_id": version.version_id,
                "material_id": version.material_id,
                "volume": version.volume,
                "signoff_reason": version.signoff_reason,
                "signed_off_by": version.signed_off_by,
                "signed_off_at": version.signed_off_at.isoformat() if version.signed_off_at else None,
            },
            status=_version_file_status(version.status),
            created_at=version.timestamp,
        )
        for version in db.query(ModelVersion).filter(
            ModelVersion.project_id == project_id,
            ModelVersion.is_deleted == False,
        ).all()
    ]

    report_files = [
        ProjectFileOut(
            item_id=f"report:{report.report_id}",
            source="reports",
            source_id=report.report_id,
            project_id=report.project_id,
            uploaded_by=report.uploader_id,
            file_type="report",
            name=report.name,
            file_url=report.file_url,
            metadata_json={"legacy_report_id": report.report_id, "report_type": report.report_type},
            status="draft",
            created_at=report.created_at,
        )
        for report in db.query(Report).filter(
            Report.project_id == project_id,
            Report.is_deleted == False,
        ).all()
    ]

    return sorted(
        native_files + model_files + report_files,
        key=lambda item: item.created_at or datetime.min,
        reverse=True,
    )


@router.get("/{project_id}/comments", response_model=List[ProjectCommentOut])
def list_project_comments(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    native_comments = [
        ProjectCommentOut(
            item_id=f"comment:{comment.comment_id}",
            source="comments",
            source_id=comment.comment_id,
            project_id=comment.project_id,
            file_id=f"file:{comment.file_id}" if comment.file_id else None,
            author_id=comment.author_id,
            body=comment.body,
            coordinates_json=comment.coordinates_json,
            status=comment.status.value,
            created_at=comment.created_at,
            resolved_at=comment.resolved_at,
        )
        for comment in db.query(Comment).filter(
            Comment.project_id == project_id,
            Comment.is_deleted == False,
        ).all()
    ]

    feedback_rows = (
        db.query(Feedback, ModelVersion)
        .join(ModelVersion, ModelVersion.version_id == Feedback.target_version_id)
        .filter(
            ModelVersion.project_id == project_id,
            ModelVersion.is_deleted == False,
            Feedback.is_deleted == False,
        )
        .all()
    )
    legacy_comments = [
        ProjectCommentOut(
            item_id=f"feedback:{feedback.feedback_id}",
            source="feedbacks",
            source_id=feedback.feedback_id,
            project_id=project_id,
            file_id=f"version:{version.version_id}",
            author_id=feedback.author_id,
            body=feedback.content,
            coordinates_json=feedback.coordinates,
            status="resolved" if feedback.resolved_at else feedback.status.value,
            created_at=None,
            resolved_at=feedback.resolved_at,
        )
        for feedback, version in feedback_rows
    ]

    return native_comments + legacy_comments


@router.get("/{project_id}/events", response_model=List[ProjectEventOut])
def list_project_events(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    return db.query(Event).filter(
        Event.project_id == project_id,
    ).order_by(Event.created_at.desc()).all()
