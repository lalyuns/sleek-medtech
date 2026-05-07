from datetime import datetime

from pydantic import BaseModel


class ReportOut(BaseModel):
    report_id: int
    project_id: int
    uploader_id: int
    name: str
    report_type: str
    file_url: str
    created_at: datetime

    model_config = {"from_attributes": True}
