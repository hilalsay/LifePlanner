import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ChatSuggestion(BaseModel):
    kind: str
    title: str
    description: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD, tasks only


class ChatAttachment(BaseModel):
    kind: str
    title: str
    priority: Optional[str] = None
    deadline: Optional[str] = None
    completed: Optional[bool] = None
    description: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    suggestions: Optional[list[ChatSuggestion]] = None
    attachments: Optional[list[ChatAttachment]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    """List view — no messages."""
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[ChatMessageOut] = []


class ChatRequest(BaseModel):
    content: str = ""
    conversation_id: Optional[uuid.UUID] = None
    attachments: list[ChatAttachment] = []
    language: str = "en"


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    title: str
    message: str
    suggestions: list[ChatSuggestion] = []
