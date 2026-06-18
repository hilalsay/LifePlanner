import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    provider: str
    created_at: datetime

    model_config = {"from_attributes": True}
