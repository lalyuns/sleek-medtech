from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_project_access
from app.models.feedback import Feedback
from app.models.model_version import ModelVersion
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/api/v1/projects", tags=["feedbacks"])


def _get_version_or_404(version_id: int, project_id: int, db: Session) -> ModelVersion:
    version = db.query(ModelVersion).filter(
        ModelVersion.version_id == version_id,
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.get("/{project_id}/versions/{version_id}/feedbacks", response_model=List[FeedbackOut])
def list_feedbacks(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)
    return db.query(Feedback).filter(
        Feedback.target_version_id == version_id,
        Feedback.is_deleted == False,
    ).all()


@router.post("/{project_id}/versions/{version_id}/feedbacks", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def create_feedback(
    project_id: int,
    version_id: int,
    body: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)
    feedback = Feedback(
        target_version_id=version_id,
        author_id=current_user.user_id,
        content=body.content,
        coordinates=body.coordinates.model_dump() if body.coordinates else None,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
