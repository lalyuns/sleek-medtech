import enum
from datetime import datetime
from sqlalchemy import Integer, Enum as SAEnum, DateTime, ForeignKey, func
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
