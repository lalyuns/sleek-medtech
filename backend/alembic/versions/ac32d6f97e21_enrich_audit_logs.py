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
    existing_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("audit_logs")}
    columns = [
        ("ip_address", sa.Column("ip_address", sa.String(length=64), nullable=True)),
        ("user_agent", sa.Column("user_agent", sa.String(length=500), nullable=True)),
        ("request_id", sa.Column("request_id", sa.String(length=100), nullable=True)),
        ("old_values", sa.Column("old_values", sa.JSON(), nullable=True)),
        ("new_values", sa.Column("new_values", sa.JSON(), nullable=True)),
    ]
    for name, column in columns:
        if name not in existing_columns:
            op.add_column("audit_logs", column)


def downgrade() -> None:
    op.drop_column("audit_logs", "new_values")
    op.drop_column("audit_logs", "old_values")
    op.drop_column("audit_logs", "request_id")
    op.drop_column("audit_logs", "user_agent")
    op.drop_column("audit_logs", "ip_address")
