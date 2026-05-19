"""add product clinical context

Revision ID: 7d81f0c9b2aa
Revises: e4f6a9201d4b
Create Date: 2026-05-19 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7d81f0c9b2aa"
down_revision: Union[str, None] = "e4f6a9201d4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("body_region", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("clinical_use", sa.String(length=200), nullable=True))
    op.add_column("products", sa.Column("surgical_stage", sa.String(length=160), nullable=True))
    op.add_column("products", sa.Column("indication", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "indication")
    op.drop_column("products", "surgical_stage")
    op.drop_column("products", "clinical_use")
    op.drop_column("products", "body_region")
