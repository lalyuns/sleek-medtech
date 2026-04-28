import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, JSON, Enum as SAEnum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, SoftDeleteMixin


class FeedbackStatus(str, enum.Enum):
    submitted = "submitted"
    converted = "converted"


class Feedback(Base, SoftDeleteMixin):
    __tablename__ = "feedbacks"

    feedback_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    target_version_id: Mapped[int] = mapped_column(ForeignKey("model_versions.version_id"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    coordinates: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[FeedbackStatus] = mapped_column(
        SAEnum(FeedbackStatus), default=FeedbackStatus.submitted, nullable=False
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
