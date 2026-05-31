from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class PublicSiteContentIn(BaseModel):
    content: Dict[str, Any]


class PublicSiteContentOut(BaseModel):
    content: Dict[str, Any]
    updated_at: Optional[datetime] = None
