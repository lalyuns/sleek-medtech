from typing import Optional
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectOut(BaseModel):
    project_id: int
    name: str
    description: Optional[str]
    status: str
    owner_id: int

    model_config = {"from_attributes": True}
