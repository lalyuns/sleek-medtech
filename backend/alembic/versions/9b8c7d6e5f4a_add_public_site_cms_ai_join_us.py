"""add public site cms ai join us

Revision ID: 9b8c7d6e5f4a
Revises: f4b2c8d91a03
Create Date: 2026-05-29 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9b8c7d6e5f4a"
down_revision: Union[str, None] = "f4b2c8d91a03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("product_type", sa.String(length=40), nullable=False, server_default="3d_product"))
    op.add_column("products", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("senior_note", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("order_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))

    op.add_column("product_requests", sa.Column("request_source", sa.String(length=40), nullable=False, server_default="web"))
    op.add_column("product_requests", sa.Column("request_type", sa.String(length=40), nullable=False, server_default="order"))
    op.add_column("product_requests", sa.Column("preferred_contact", sa.String(length=80), nullable=True))
    op.add_column("product_requests", sa.Column("delivery_note", sa.Text(), nullable=True))
    op.add_column("product_requests", sa.Column("line_user_id", sa.String(length=120), nullable=True))

    op.create_table(
        "public_site_contents",
        sa.Column("content_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("content_id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "join_us_applications",
        sa.Column("application_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=60), nullable=True),
        sa.Column("applicant_type", sa.String(length=80), nullable=True),
        sa.Column("interest", sa.String(length=180), nullable=False),
        sa.Column("portfolio_url", sa.Text(), nullable=True),
        sa.Column("intro", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("submitted", "reviewing", "contacted", "archived", name="joinusapplicationstatus"),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("application_id"),
    )


def downgrade() -> None:
    op.drop_table("join_us_applications")
    op.drop_table("public_site_contents")

    op.drop_column("product_requests", "line_user_id")
    op.drop_column("product_requests", "delivery_note")
    op.drop_column("product_requests", "preferred_contact")
    op.drop_column("product_requests", "request_type")
    op.drop_column("product_requests", "request_source")

    op.drop_column("products", "order_enabled")
    op.drop_column("products", "senior_note")
    op.drop_column("products", "image_url")
    op.drop_column("products", "product_type")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS joinusapplicationstatus")
