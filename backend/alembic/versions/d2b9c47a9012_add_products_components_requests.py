"""add products components requests

Revision ID: d2b9c47a9012
Revises: c8e2f184a7d5
Create Date: 2026-05-15 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2b9c47a9012"
down_revision: Union[str, None] = "c8e2f184a7d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("product_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("sku", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("active", "archived", name="productstatus"), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("product_id"),
        sa.UniqueConstraint("sku"),
    )
    op.create_table(
        "components",
        sa.Column("component_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("part_number", sa.String(length=80), nullable=True),
        sa.Column("source_type", sa.Enum("self_made", "purchased", "outsourced", "customer_supplied", name="componentsourcetype"), nullable=False),
        sa.Column("unit", sa.String(length=24), nullable=False),
        sa.Column("supplier_name", sa.String(length=140), nullable=True),
        sa.Column("unit_cost", sa.DECIMAL(12, 2), nullable=True),
        sa.Column("lead_time_days", sa.Integer(), nullable=True),
        sa.Column("is_critical", sa.Boolean(), nullable=False),
        sa.Column("requires_certificate", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("component_id"),
    )
    op.create_table(
        "product_bom_items",
        sa.Column("item_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("component_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.DECIMAL(12, 3), nullable=False),
        sa.Column("unit", sa.String(length=24), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["component_id"], ["components.component_id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_id"]),
        sa.PrimaryKeyConstraint("item_id"),
    )
    op.create_table(
        "product_requests",
        sa.Column("request_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("requester_name", sa.String(length=100), nullable=False),
        sa.Column("organization", sa.String(length=140), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=60), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("submitted", "reviewing", "quoted", "approved", "rejected", name="productrequeststatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_id"]),
        sa.PrimaryKeyConstraint("request_id"),
    )


def downgrade() -> None:
    op.drop_table("product_requests")
    op.drop_table("product_bom_items")
    op.drop_table("components")
    op.drop_table("products")
