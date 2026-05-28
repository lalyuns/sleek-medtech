import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Enum as SAEnum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, SoftDeleteMixin


class ProjectStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class Project(Base, SoftDeleteMixin):
    __tablename__ = "projects"

    project_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus), default=ProjectStatus.active, nullable=False
    )
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.product_id"), nullable=True)
    product_name: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)
    material_name: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
