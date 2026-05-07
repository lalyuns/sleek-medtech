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
    current_access_level: Optional[str] = None

    model_config = {"from_attributes": True}
