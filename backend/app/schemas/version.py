from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class VersionCreate(BaseModel):
    material_id: int
    description: Optional[str] = None
    file_url: str
    hash_value: str
    total_chunks: Optional[int] = None


class VersionOut(BaseModel):
    version_id: int
    project_id: int
    uploader_id: int
    material_id: int
    file_url: str
    version_number: int
    description: Optional[str]
    volume: Optional[float]
    hash_value: str
    status: str
    timestamp: datetime

    model_config = {"from_attributes": True}
