import uuid
from datetime import date
from typing import Optional
from sqlalchemy import String, Text, Integer, Boolean, Date, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class LifeArea(BaseModel):
    __tablename__ = "life_areas"

    user_id: Mapped[uuid.UUID] = mapped_column()
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    icon: Mapped[str] = mapped_column(String(50), default="star")
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    yearly_goals: Mapped[list["YearlyGoal"]] = relationship(back_populates="life_area")


class YearlyGoal(BaseModel):
    __tablename__ = "yearly_goals"

    user_id: Mapped[uuid.UUID] = mapped_column()
    life_area_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("life_areas.id"), nullable=True)
    year: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, completed, abandoned
    progress: Mapped[float] = mapped_column(Float, default=0.0)

    life_area: Mapped[Optional[LifeArea]] = relationship(back_populates="yearly_goals")
    monthly_focuses: Mapped[list["MonthlyFocus"]] = relationship(back_populates="yearly_goal")


class MonthlyFocus(BaseModel):
    __tablename__ = "monthly_focuses"

    user_id: Mapped[uuid.UUID] = mapped_column()
    yearly_goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("yearly_goals.id"), nullable=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)  # 1-12
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reflection: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    yearly_goal: Mapped[Optional[YearlyGoal]] = relationship(back_populates="monthly_focuses")
    weekly_priorities: Mapped[list["WeeklyPriority"]] = relationship(back_populates="monthly_focus")


class WeeklyPriority(BaseModel):
    __tablename__ = "weekly_priorities"

    user_id: Mapped[uuid.UUID] = mapped_column()
    monthly_focus_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("monthly_focuses.id"), nullable=True)
    year: Mapped[int] = mapped_column(Integer)
    week_number: Mapped[int] = mapped_column(Integer)  # ISO week
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    reflection: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    monthly_focus: Mapped[Optional[MonthlyFocus]] = relationship(back_populates="weekly_priorities")
    daily_tasks: Mapped[list["DailyTask"]] = relationship(back_populates="weekly_priority")


class DailyTask(BaseModel):
    __tablename__ = "daily_tasks"

    user_id: Mapped[uuid.UUID] = mapped_column()
    weekly_priority_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("weekly_priorities.id"), nullable=True)
    task_date: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # low, medium, high
    estimated_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actual_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # comma-separated

    weekly_priority: Mapped[Optional[WeeklyPriority]] = relationship(back_populates="daily_tasks")


class PlanningNote(BaseModel):
    __tablename__ = "planning_notes"

    user_id: Mapped[uuid.UUID] = mapped_column()
    note_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    week_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    note_type: Mapped[str] = mapped_column(String(20), default="daily")  # daily, weekly, monthly, yearly
