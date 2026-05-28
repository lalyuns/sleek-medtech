"""add core workspace schema

Revision ID: f4b2c8d91a03
Revises: 7d81f0c9b2aa
Create Date: 2026-05-27 22:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4b2c8d91a03"
down_revision: Union[str, None] = "7d81f0c9b2aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("product_name", sa.String(length=140), nullable=True))
    op.add_column("projects", sa.Column("material_name", sa.String(length=140), nullable=True))
    op.add_column("projects", sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True))

    op.create_table(
        "project_members",
        sa.Column("member_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("access_level", sa.Enum("read_only", "edit", "admin", name="projectaccesslevel"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("member_id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_members_project_user"),
    )
    op.execute(
        """
        INSERT INTO project_members (project_id, user_id, access_level)
        SELECT project_id, user_id, access_level
        FROM user_project_mappings
        """
    )

    op.create_table(
        "project_files",
        sa.Column("file_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("file_type", sa.Enum("model", "report", "certificate", "image", "other", name="projectfiletype"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("hash_value", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("status", sa.Enum("uploading", "draft", "signed_off", "archived", name="projectfilestatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("file_id"),
    )

    op.create_table(
        "comments",
        sa.Column("comment_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=True),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("coordinates_json", sa.JSON(), nullable=True),
        sa.Column("status", sa.Enum("open", "resolved", name="commentstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["file_id"], ["project_files.file_id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("comment_id"),
    )

    op.create_table(
        "events",
        sa.Column("event_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("target_type", sa.String(length=80), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("event_id"),
    )


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("comments")
    op.drop_table("project_files")
    op.drop_table("project_members")
    op.drop_column("projects", "updated_at")
    op.drop_column("projects", "material_name")
    op.drop_column("projects", "product_name")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS commentstatus")
        op.execute("DROP TYPE IF EXISTS projectfilestatus")
        op.execute("DROP TYPE IF EXISTS projectfiletype")
        op.execute("DROP TYPE IF EXISTS projectaccesslevel")
