import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

def _normalize_email(v: str) -> str:
    return v.strip().lower()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    display_name: Optional[str] = Field(None, max_length=100)

    _email = field_validator("email")(_normalize_email)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)

    _email = field_validator("email")(_normalize_email)

class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    provider: str
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
