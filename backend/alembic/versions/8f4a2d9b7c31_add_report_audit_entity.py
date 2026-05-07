"""add report audit entity

Revision ID: 8f4a2d9b7c31
Revises: 6b73e097dad9
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "8f4a2d9b7c31"
down_revision: Union[str, None] = "6b73e097dad9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE audit_logs MODIFY entity_type "
        "ENUM('model_version','material','feedback','report','user','cost','project') NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE audit_logs MODIFY entity_type "
        "ENUM('model_version','material','feedback','user','cost','project') NOT NULL"
    )
