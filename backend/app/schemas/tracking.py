import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class MoodEntryCreate(BaseModel):
    entry_date: date
    mood_score: int  # 1-10
    energy_score: int  # 1-10
    notes: Optional[str] = None
    tags: Optional[str] = None


class MoodEntryUpdate(BaseModel):
    mood_score: Optional[int] = None
    energy_score: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[str] = None


class MoodEntryOut(BaseModel):
    id: uuid.UUID
    entry_date: date
    mood_score: int
    energy_score: int
    notes: Optional[str]
    tags: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class HealthEntryCreate(BaseModel):
    entry_date: date
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    exercise_minutes: Optional[int] = None
    weight_kg: Optional[float] = None
    steps: Optional[int] = None
    notes: Optional[str] = None


class HealthEntryUpdate(BaseModel):
    sleep_hours: Optional[float] = None
    water_glasses: Optional[int] = None
    exercise_minutes: Optional[int] = None
    weight_kg: Optional[float] = None
    steps: Optional[int] = None
    notes: Optional[str] = None


class HealthEntryOut(BaseModel):
    id: uuid.UUID
    entry_date: date
    sleep_hours: Optional[float]
    water_glasses: Optional[int]
    exercise_minutes: Optional[int]
    weight_kg: Optional[float]
    steps: Optional[int]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class BookEntryCreate(BaseModel):
    title: str
    author: Optional[str] = None
    status: str = "to_read"
    genre: Optional[str] = None
    total_pages: Optional[int] = None
    current_page: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    review: Optional[str] = None


class BookEntryUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    genre: Optional[str] = None
    total_pages: Optional[int] = None
    current_page: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    review: Optional[str] = None


class BookEntryOut(BaseModel):
    id: uuid.UUID
    title: str
    author: Optional[str]
    status: str
    genre: Optional[str]
    total_pages: Optional[int]
    current_page: Optional[int]
    start_date: Optional[date]
    end_date: Optional[date]
    rating: Optional[int]
    notes: Optional[str]
    cover_url: Optional[str]
    review: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class GoogleBookResult(BaseModel):
    title: str
    author: Optional[str] = None
    cover_url: Optional[str] = None


class WeeklyAIReviewOut(BaseModel):
    id: uuid.UUID
    year: int
    week_number: int
    content: str
    model_used: str
    created_at: datetime

    model_config = {"from_attributes": True}
