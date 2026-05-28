import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin


class CommentStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"


class Comment(Base, SoftDeleteMixin):
    __tablename__ = "comments"

    comment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    file_id: Mapped[Optional[int]] = mapped_column(ForeignKey("project_files.file_id"), nullable=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    coordinates_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[CommentStatus] = mapped_column(
        SAEnum(CommentStatus),
        default=CommentStatus.open,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
