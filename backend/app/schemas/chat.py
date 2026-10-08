import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator


class ChatSuggestion(BaseModel):
    kind: str = "suggestion"
    title: str = ""
    description: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD, tasks only

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data):
        """Accept the varied shapes the model emits, e.g.
        {'type': 'insight', 'text': '...'} or {'type': 'task_created', 'title': '...'}.
        Maps 'type'->'kind' and 'text'->'title' so neither field is missing.
        """
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if not d.get("kind"):
            d["kind"] = d.get("type") or "suggestion"
        if not d.get("title"):
            d["title"] = d.get("text") or ""
        return d


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
