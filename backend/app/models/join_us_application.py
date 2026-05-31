import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin


class JoinUsApplicationStatus(str, enum.Enum):
    submitted = "submitted"
    reviewing = "reviewing"
    contacted = "contacted"
    archived = "archived"


class JoinUsApplication(Base, SoftDeleteMixin):
    __tablename__ = "join_us_applications"

    application_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    applicant_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    interest: Mapped[str] = mapped_column(String(180), nullable=False)
    portfolio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    intro: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[JoinUsApplicationStatus] = mapped_column(
        SAEnum(JoinUsApplicationStatus),
        default=JoinUsApplicationStatus.submitted,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
