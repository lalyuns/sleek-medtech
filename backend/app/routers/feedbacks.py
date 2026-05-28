from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.rbac import require_project_access
from app.models.feedback import Feedback
from app.models.model_version import ModelVersion
from app.models.reference_edge import ReferenceEdge, TargetType
from app.models.user import User, UserRole
from app.models.user_project_mapping import AccessLevel, UserProjectMapping
from app.schemas.feedback import FeedbackCreate, FeedbackOut, FeedbackUpdate
from app.services.events import record_event

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


def _can_mutate_feedback(current_user: User, feedback: Feedback, project_id: int, db: Session) -> bool:
    if current_user.role == UserRole.admin or feedback.author_id == current_user.user_id:
        return True
    mapping = db.query(UserProjectMapping).filter(
        UserProjectMapping.project_id == project_id,
        UserProjectMapping.user_id == current_user.user_id,
    ).first()
    return mapping is not None and mapping.access_level in (AccessLevel.edit, AccessLevel.admin)


def _get_feedback_or_404(feedback_id: int, version_id: int, db: Session) -> Feedback:
    feedback = db.query(Feedback).filter(
        Feedback.feedback_id == feedback_id,
        Feedback.target_version_id == version_id,
        Feedback.is_deleted == False,
    ).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return feedback


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
    db.flush()
    record_event(
        db,
        project_id=project_id,
        actor_id=current_user.user_id,
        event_type="comment.created",
        target_type="feedback",
        target_id=feedback.feedback_id,
        summary="新增模型回饋",
        payload_json={"version_id": version_id},
    )
    db.commit()
    db.refresh(feedback)
    return feedback


@router.put("/{project_id}/versions/{version_id}/feedbacks/{feedback_id}", response_model=FeedbackOut)
def update_feedback(
    project_id: int,
    version_id: int,
    feedback_id: int,
    body: FeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)
    feedback = _get_feedback_or_404(feedback_id, version_id, db)
    if not _can_mutate_feedback(current_user, feedback, project_id, db):
        raise HTTPException(status_code=403, detail="Cannot edit this feedback")
    feedback.content = body.content
    db.commit()
    db.refresh(feedback)
    return feedback


@router.delete("/{project_id}/versions/{version_id}/feedbacks/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feedback(
    project_id: int,
    version_id: int,
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)
    feedback = _get_feedback_or_404(feedback_id, version_id, db)
    if not _can_mutate_feedback(current_user, feedback, project_id, db):
        raise HTTPException(status_code=403, detail="Cannot delete this feedback")
    feedback.is_deleted = True
    feedback.deleted_at = datetime.utcnow()
    db.query(ReferenceEdge).filter(
        ReferenceEdge.target_type == TargetType.feedback,
        ReferenceEdge.target_id == feedback_id,
    ).delete(synchronize_session=False)
    db.commit()
