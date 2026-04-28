from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, SoftDeleteMixin


class Material(Base, SoftDeleteMixin):
    __tablename__ = "materials"

    material_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    physical_parameters: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
