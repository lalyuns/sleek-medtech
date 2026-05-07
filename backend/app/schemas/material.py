from typing import Optional
from pydantic import BaseModel


class MaterialParameters(BaseModel):
    density: float
    tensile_strength: float
    unit_price: float
    unit_price_unit: str = "per_g"


class MaterialCreate(BaseModel):
    name: str
    physical_parameters: MaterialParameters


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    physical_parameters: Optional[MaterialParameters] = None
    is_active: Optional[bool] = None


class MaterialOut(BaseModel):
    material_id: int
    name: str
    physical_parameters: dict
    is_active: bool

    model_config = {"from_attributes": True}
