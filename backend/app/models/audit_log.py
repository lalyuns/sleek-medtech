import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Enum as SAEnum, DateTime, ForeignKey, func, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class AuditAction(str, enum.Enum):
    upload = "upload"
    sign_off = "sign_off"
    change_material = "change_material"
    delete = "delete"
    create = "create"
    update = "update"


class AuditEntityType(str, enum.Enum):
    model_version = "model_version"
    material = "material"
    feedback = "feedback"
    report = "report"
    user = "user"
    cost = "cost"
    project = "project"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    action: Mapped[AuditAction] = mapped_column(SAEnum(AuditAction), nullable=False)
    entity_type: Mapped[AuditEntityType] = mapped_column(SAEnum(AuditEntityType), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
