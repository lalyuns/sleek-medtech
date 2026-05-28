import enum

from sqlalchemy import Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ProjectAccessLevel(str, enum.Enum):
    read_only = "read_only"
    edit = "edit"
    admin = "admin"


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_members_project_user"),
    )

    member_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    access_level: Mapped[ProjectAccessLevel] = mapped_column(SAEnum(ProjectAccessLevel), nullable=False)
