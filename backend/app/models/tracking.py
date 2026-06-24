import uuid
from datetime import date
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class MoodEntry(BaseModel):
    __tablename__ = "mood_entries"

    user_id: Mapped[uuid.UUID] = mapped_column()
    entry_date: Mapped[date] = mapped_column(Date)
    mood_score: Mapped[int] = mapped_column(Integer)  # 1-10
    energy_score: Mapped[int] = mapped_column(Integer)  # 1-10
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # comma-separated


class HealthEntry(BaseModel):
    __tablename__ = "health_entries"

    user_id: Mapped[uuid.UUID] = mapped_column()
    entry_date: Mapped[date] = mapped_column(Date)
    sleep_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    water_glasses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    exercise_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    steps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class BookEntry(BaseModel):
    __tablename__ = "book_entries"

    user_id: Mapped[uuid.UUID] = mapped_column()
    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="to_read")  # to_read, reading, completed, abandoned
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    total_pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    current_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    review: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class WeeklyAIReview(BaseModel):
    __tablename__ = "weekly_ai_reviews"

    user_id: Mapped[uuid.UUID] = mapped_column()
    year: Mapped[int] = mapped_column(Integer)
    week_number: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    model_used: Mapped[str] = mapped_column(String(100), default="ai")
