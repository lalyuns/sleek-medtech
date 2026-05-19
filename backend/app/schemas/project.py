from typing import Optional
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    product_id: Optional[int] = None


class ProjectOut(BaseModel):
    project_id: int
    name: str
    description: Optional[str]
    status: str
    owner_id: int
    product_id: Optional[int] = None
    current_access_level: Optional[str] = None

    model_config = {"from_attributes": True}
