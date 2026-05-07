from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class VersionLockRequest(BaseModel):
    reason: str
    password: str


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
    signed_off_by: Optional[int] = None
    signed_off_at: Optional[datetime] = None
    signoff_reason: Optional[str] = None
    signoff_user_snapshot: Optional[dict] = None

    model_config = {"from_attributes": True}
