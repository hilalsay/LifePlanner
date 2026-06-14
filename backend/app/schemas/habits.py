import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"
    target_count: int = 1
    color: str = "#6366f1"
    icon: str = "check"
    order_index: int = 0


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    target_count: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None


class HabitOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    frequency: str
    target_count: int
    color: str
    icon: str
    is_active: bool
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class HabitEntryCreate(BaseModel):
    habit_id: uuid.UUID
    entry_date: date
    completed: bool = False
    count: int = 0
    notes: Optional[str] = None


class HabitEntryUpdate(BaseModel):
    completed: Optional[bool] = None
    count: Optional[int] = None
    notes: Optional[str] = None


class HabitEntryOut(BaseModel):
    id: uuid.UUID
    habit_id: uuid.UUID
    entry_date: date
    completed: bool
    count: int
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class HabitWithEntries(HabitOut):
    entries: list[HabitEntryOut] = []
