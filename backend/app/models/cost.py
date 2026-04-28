import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DECIMAL, Enum as SAEnum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, SoftDeleteMixin


class CostType(str, enum.Enum):
    labor = "labor"
    external_sample = "external_sample"


class Cost(Base, SoftDeleteMixin):
    __tablename__ = "costs"

    cost_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    type: Mapped[CostType] = mapped_column(SAEnum(CostType), nullable=False)
    amount: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
