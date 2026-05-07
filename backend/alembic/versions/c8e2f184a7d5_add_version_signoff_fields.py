"""add version signoff fields

Revision ID: c8e2f184a7d5
Revises: bd74aa6024c8
Create Date: 2026-05-06 00:00:03.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8e2f184a7d5"
down_revision: Union[str, None] = "bd74aa6024c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("model_versions", sa.Column("signed_off_by", sa.Integer(), nullable=True))
    op.add_column("model_versions", sa.Column("signed_off_at", sa.DateTime(), nullable=True))
    op.add_column("model_versions", sa.Column("signoff_reason", sa.Text(), nullable=True))
    op.add_column("model_versions", sa.Column("signoff_user_snapshot", sa.JSON(), nullable=True))
    op.create_foreign_key(
        "fk_model_versions_signed_off_by_users",
        "model_versions",
        "users",
        ["signed_off_by"],
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_model_versions_signed_off_by_users", "model_versions", type_="foreignkey")
    op.drop_column("model_versions", "signoff_user_snapshot")
    op.drop_column("model_versions", "signoff_reason")
    op.drop_column("model_versions", "signed_off_at")
    op.drop_column("model_versions", "signed_off_by")
