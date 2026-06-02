"""public site merge compatibility

Revision ID: 9b8c7d6e5f4a
Revises: f4b2c8d91a03
Create Date: 2026-06-03 04:25:00.000000

This platform-only branch intentionally excludes the public website CMS,
AI assistant, and join-us tables that were introduced in the merged public
site branch. The revision is kept as a no-op so databases that already
recorded this migration can run this branch without a reset.
"""
from typing import Sequence, Union


revision: str = "9b8c7d6e5f4a"
down_revision: Union[str, None] = "f4b2c8d91a03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
