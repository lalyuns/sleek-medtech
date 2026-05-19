"""link projects to products

Revision ID: e4f6a9201d4b
Revises: d2b9c47a9012
Create Date: 2026-05-15 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4f6a9201d4b"
down_revision: Union[str, None] = "d2b9c47a9012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("product_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_projects_product_id_products",
        "projects",
        "products",
        ["product_id"],
        ["product_id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_projects_product_id_products", "projects", type_="foreignkey")
    op.drop_column("projects", "product_id")
