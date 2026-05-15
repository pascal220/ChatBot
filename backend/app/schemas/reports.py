import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    session_id: uuid.UUID
    title: str = "Report"
    # Subset of data record IDs to include as context (empty = include all user records)
    data_record_ids: list[uuid.UUID] = []
    model: Optional[str] = None


class ReportResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    markdown_content: str
    pdf_key: Optional[str]
    session_id: Optional[uuid.UUID]
    created_at: datetime
