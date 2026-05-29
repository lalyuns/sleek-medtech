import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, DECIMAL, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin


class ProductStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class ComponentSourceType(str, enum.Enum):
    self_made = "self_made"
    purchased = "purchased"
    outsourced = "outsourced"
    customer_supplied = "customer_supplied"


class ProductRequestStatus(str, enum.Enum):
    submitted = "submitted"
    reviewing = "reviewing"
    quoted = "quoted"
    approved = "approved"
    rejected = "rejected"


class Product(Base, SoftDeleteMixin):
    __tablename__ = "products"

    product_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_region: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    clinical_use: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    surgical_stage: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    indication: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_type: Mapped[str] = mapped_column(String(40), default="3d_product", nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    senior_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[ProductStatus] = mapped_column(SAEnum(ProductStatus), default=ProductStatus.active, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Component(Base, SoftDeleteMixin):
    __tablename__ = "components"

    component_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    part_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    source_type: Mapped[ComponentSourceType] = mapped_column(SAEnum(ComponentSourceType), nullable=False)
    unit: Mapped[str] = mapped_column(String(24), default="pcs", nullable=False)
    supplier_name: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)
    unit_cost: Mapped[Optional[float]] = mapped_column(DECIMAL(12, 2), nullable=True)
    lead_time_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_certificate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ProductBOMItem(Base, SoftDeleteMixin):
    __tablename__ = "product_bom_items"

    item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.product_id"), nullable=False)
    component_id: Mapped[int] = mapped_column(ForeignKey("components.component_id"), nullable=False)
    quantity: Mapped[float] = mapped_column(DECIMAL(12, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(24), default="pcs", nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ProductRequest(Base, SoftDeleteMixin):
    __tablename__ = "product_requests"

    request_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.product_id"), nullable=True)
    requester_name: Mapped[str] = mapped_column(String(100), nullable=False)
    organization: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_source: Mapped[str] = mapped_column(String(40), default="web", nullable=False)
    request_type: Mapped[str] = mapped_column(String(40), default="order", nullable=False)
    preferred_contact: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    delivery_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    line_user_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[ProductRequestStatus] = mapped_column(
        SAEnum(ProductRequestStatus),
        default=ProductRequestStatus.submitted,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
