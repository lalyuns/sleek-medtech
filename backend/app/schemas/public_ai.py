from typing import Literal, Optional

from pydantic import BaseModel, Field


class PublicAiChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=600)


class PublicAiChatOut(BaseModel):
    answer: str
    source: Literal["openai", "fallback"] = "openai"
    action_label: Optional[str] = None
    action_href: Optional[str] = None
