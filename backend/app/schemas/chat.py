import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator


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
    kind: str = Field(max_length=20)
    title: str = Field(max_length=300)
    priority: Optional[str] = Field(None, max_length=20)
    deadline: Optional[str] = Field(None, max_length=40)
    completed: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=2000)


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
    content: str = Field("", max_length=8000)
    conversation_id: Optional[uuid.UUID] = None
    attachments: list[ChatAttachment] = Field(default_factory=list, max_length=20)
    language: str = Field("en", max_length=10)


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    title: str
    message: str
    suggestions: list[ChatSuggestion] = []
