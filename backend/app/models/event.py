from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Event(Base):
    __tablename__ = "events"

    event_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    target_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
