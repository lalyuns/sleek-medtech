import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin


class ProjectFileType(str, enum.Enum):
    model = "model"
    report = "report"
    certificate = "certificate"
    image = "image"
    other = "other"


class ProjectFileStatus(str, enum.Enum):
    uploading = "uploading"
    draft = "draft"
    signed_off = "signed_off"
    archived = "archived"


class ProjectFile(Base, SoftDeleteMixin):
    __tablename__ = "project_files"

    file_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    file_type: Mapped[ProjectFileType] = mapped_column(SAEnum(ProjectFileType), nullable=False)
    version_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    hash_value: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[ProjectFileStatus] = mapped_column(
        SAEnum(ProjectFileStatus),
        default=ProjectFileStatus.draft,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
