import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: str = "New Chat"


class ChatSessionUpdate(BaseModel):
    title: str


class ChatSessionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    content: str
    model: Optional[str] = None
    file_keys: list[str] = []
    include_web_search: bool = False


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    role: str
    content: str
    file_keys: list
    created_at: datetime
