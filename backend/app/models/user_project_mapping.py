import enum
from sqlalchemy import Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class AccessLevel(str, enum.Enum):
    read_only = "read_only"
    edit = "edit"
    admin = "admin"


class UserProjectMapping(Base):
    __tablename__ = "user_project_mappings"

    mapping_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    access_level: Mapped[AccessLevel] = mapped_column(SAEnum(AccessLevel), nullable=False)
