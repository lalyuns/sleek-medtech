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


class BOMOut(BaseModel):
    version_id: int
    material_name: str
    volume: Optional[float]
    unit_price: float
    material_cost: Optional[float]
    other_costs: List[CostOut]
    total_cost: float
