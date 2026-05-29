from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class JoinUsApplicationCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    applicant_type: Optional[str] = None
    interest: str
    portfolio_url: Optional[str] = None
    intro: str


class JoinUsApplicationUpdate(BaseModel):
    status: str


class JoinUsApplicationOut(JoinUsApplicationCreate):
    application_id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
