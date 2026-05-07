from typing import Optional
from pydantic import BaseModel


class Coordinates(BaseModel):
    x: float
    y: float
    z: float


class FeedbackCreate(BaseModel):
    content: str
    coordinates: Optional[Coordinates] = None


class FeedbackUpdate(BaseModel):
    content: str


class FeedbackOut(BaseModel):
    feedback_id: int
    target_version_id: int
    author_id: int
    content: str
    coordinates: Optional[dict]
    status: str

    model_config = {"from_attributes": True}
