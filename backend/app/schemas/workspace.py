from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProjectFileOut(BaseModel):
    item_id: str
    source: str
    source_id: int
    project_id: int
    uploaded_by: int
    file_type: str
    version_number: Optional[int] = None
    name: str
    file_url: str
    hash_value: Optional[str] = None
    metadata_json: Optional[dict] = None
    status: str
    created_at: Optional[datetime] = None


class ProjectCommentOut(BaseModel):
    item_id: str
    source: str
    source_id: int
    project_id: int
    file_id: Optional[str] = None
    author_id: int
    body: str
    coordinates_json: Optional[dict] = None
    status: str
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


class ProjectEventOut(BaseModel):
    event_id: int
    project_id: int
    actor_id: Optional[int] = None
    event_type: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    summary: str
    payload_json: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}
