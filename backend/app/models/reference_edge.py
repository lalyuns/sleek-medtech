import enum
from sqlalchemy import Integer, Enum as SAEnum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class TargetType(str, enum.Enum):
    old_version = "old_version"
    feedback = "feedback"
    report = "report"


class ReferenceEdge(Base):
    __tablename__ = "reference_edges"
    __table_args__ = (
        Index("ix_ref_edges_source_target", "source_version_id", "target_id"),
    )

    edge_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_version_id: Mapped[int] = mapped_column(ForeignKey("model_versions.version_id"), nullable=False)
    target_type: Mapped[TargetType] = mapped_column(SAEnum(TargetType), nullable=False)
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
