import uuid
from datetime import date
from typing import Optional
from sqlalchemy import String, Text, Integer, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class Habit(BaseModel):
    __tablename__ = "habits"

    user_id: Mapped[uuid.UUID] = mapped_column()
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frequency: Mapped[str] = mapped_column(String(20), default="daily")  # daily, weekly
    target_count: Mapped[int] = mapped_column(Integer, default=1)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    icon: Mapped[str] = mapped_column(String(50), default="check")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    entries: Mapped[list["HabitEntry"]] = relationship(back_populates="habit")


class HabitEntry(BaseModel):
    __tablename__ = "habit_entries"

    user_id: Mapped[uuid.UUID] = mapped_column()
    habit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("habits.id"))
    entry_date: Mapped[date] = mapped_column(Date)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    habit: Mapped[Habit] = relationship(back_populates="entries")
