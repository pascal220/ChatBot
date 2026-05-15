import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel


DataType = Literal["timeseries", "text", "number", "json"]


class DataRecordCreate(BaseModel):
    name: str
    data_type: DataType
    content: Any  # validated further per data_type in the endpoint
    meta: dict = {}


class DataRecordUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[Any] = None
    meta: Optional[dict] = None


class DataRecordResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    data_type: str
    content: Any
    meta: dict
    created_at: datetime
    updated_at: datetime
