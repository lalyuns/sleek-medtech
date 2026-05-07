"""enrich audit logs

Revision ID: ac32d6f97e21
Revises: 8f4a2d9b7c31
Create Date: 2026-05-06 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ac32d6f97e21"
down_revision: Union[str, None] = "8f4a2d9b7c31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("ip_address", sa.String(length=64), nullable=True))
    op.add_column("audit_logs", sa.Column("user_agent", sa.String(length=500), nullable=True))
    op.add_column("audit_logs", sa.Column("request_id", sa.String(length=100), nullable=True))
    op.add_column("audit_logs", sa.Column("old_values", sa.JSON(), nullable=True))
    op.add_column("audit_logs", sa.Column("new_values", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_logs", "new_values")
    op.drop_column("audit_logs", "old_values")
    op.drop_column("audit_logs", "request_id")
    op.drop_column("audit_logs", "user_agent")
    op.drop_column("audit_logs", "ip_address")
