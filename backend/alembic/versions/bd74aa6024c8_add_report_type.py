"""add report type

Revision ID: bd74aa6024c8
Revises: ac32d6f97e21
Create Date: 2026-05-06 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "bd74aa6024c8"
down_revision: Union[str, None] = "ac32d6f97e21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reports", sa.Column("report_type", sa.String(length=100), nullable=False, server_default="material_test"))
    op.alter_column("reports", "report_type", server_default=None)


def downgrade() -> None:
    op.drop_column("reports", "report_type")
