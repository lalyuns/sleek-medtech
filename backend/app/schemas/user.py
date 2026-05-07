from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None


class UserOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectMemberOut(BaseModel):
    mapping_id: int
    user_id: int
    project_id: int
    access_level: str
    name: str
    email: EmailStr
    role: str
    last_activity_at: Optional[datetime] = None
