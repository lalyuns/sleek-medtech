import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, Enum as SAEnum, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, SoftDeleteMixin


class VersionStatus(str, enum.Enum):
    uploading = "uploading"
    draft = "draft"
    locked = "locked"


class ModelVersion(Base, SoftDeleteMixin):
    __tablename__ = "model_versions"

    version_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    uploader_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.material_id"), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hash_value: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[VersionStatus] = mapped_column(
        SAEnum(VersionStatus), default=VersionStatus.draft, nullable=False
    )
    total_chunks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    signed_off_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    signed_off_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    signoff_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signoff_user_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
