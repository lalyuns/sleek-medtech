from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class CostCreate(BaseModel):
    type: str  # labor | external_sample
    amount: float
    description: Optional[str] = None


class CostOut(BaseModel):
    cost_id: int
    project_id: int
    type: str
    amount: float
    description: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class BOMProductContext(BaseModel):
    product_id: int
    name: str
    sku: str
    description: Optional[str] = None
    body_region: Optional[str] = None
    clinical_use: Optional[str] = None
    surgical_stage: Optional[str] = None
    indication: Optional[str] = None


class BOMVersionContext(BaseModel):
    version_id: int
    version_number: int
    status: str
    description: Optional[str] = None


class BOMOut(BaseModel):
    version_id: int
    product: Optional[BOMProductContext] = None
    version: BOMVersionContext
    material_name: str
    volume: Optional[float]
    volume_unit: str = "mm3"
    material_volume_cm3: Optional[float]
    density: float
    density_unit: str = "g/cm3"
    unit_price: float
    unit_price_unit: str = "per_g"
    material_quantity: Optional[float]
    material_quantity_unit: str = "g"
    material_cost: Optional[float]
    labor_cost: float
    external_sample_cost: float
    other_costs: List[CostOut]
    total_cost: float
