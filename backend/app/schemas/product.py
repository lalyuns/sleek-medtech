from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ComponentCreate(BaseModel):
    name: str
    part_number: Optional[str] = None
    source_type: str
    unit: str = "pcs"
    supplier_name: Optional[str] = None
    unit_cost: Optional[float] = None
    lead_time_days: Optional[int] = None
    is_critical: bool = False
    requires_certificate: bool = False


class ComponentOut(ComponentCreate):
    component_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    sku: str
    description: Optional[str] = None
    body_region: Optional[str] = None
    clinical_use: Optional[str] = None
    surgical_stage: Optional[str] = None
    indication: Optional[str] = None
    product_type: str = "3d_product"
    image_url: Optional[str] = None
    senior_note: Optional[str] = None
    order_enabled: bool = True
    status: str = "active"
    is_public: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    body_region: Optional[str] = None
    clinical_use: Optional[str] = None
    surgical_stage: Optional[str] = None
    indication: Optional[str] = None
    product_type: Optional[str] = None
    image_url: Optional[str] = None
    senior_note: Optional[str] = None
    order_enabled: Optional[bool] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None


class ProductOut(ProductCreate):
    product_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductBOMItemCreate(BaseModel):
    component_id: int
    quantity: float
    unit: str = "pcs"
    note: Optional[str] = None
    sort_order: int = 0


class ProductBOMItemOut(BaseModel):
    item_id: int
    product_id: int
    component_id: int
    quantity: float
    unit: str
    note: Optional[str]
    sort_order: int
    component: ComponentOut


class ProductDetailOut(ProductOut):
    bom_items: List[ProductBOMItemOut] = Field(default_factory=list)


class PublicComponentOut(BaseModel):
    name: str
    source_type: str
    quantity: float
    unit: str
    is_critical: bool
    requires_certificate: bool
    note: Optional[str]


class PublicProductOut(BaseModel):
    product_id: int
    name: str
    sku: str
    description: Optional[str]
    body_region: Optional[str] = None
    clinical_use: Optional[str] = None
    surgical_stage: Optional[str] = None
    indication: Optional[str] = None
    product_type: str = "3d_product"
    image_url: Optional[str] = None
    senior_note: Optional[str] = None
    order_enabled: bool = True
    bom_items: List[PublicComponentOut] = Field(default_factory=list)


class ProductRequestCreate(BaseModel):
    product_id: Optional[int] = None
    requester_name: str
    organization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    message: Optional[str] = None
    request_source: str = "web"
    request_type: str = "order"
    preferred_contact: Optional[str] = None
    delivery_note: Optional[str] = None
    line_user_id: Optional[str] = None


class ProductRequestUpdate(BaseModel):
    status: str


class ProductRequestOut(ProductRequestCreate):
    request_id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
