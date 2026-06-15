import uuid
from datetime import date, time, datetime
from typing import Optional
from pydantic import BaseModel


class LifeAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"
    icon: str = "star"
    order_index: int = 0


class LifeAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order_index: Optional[int] = None


class LifeAreaOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    color: str
    icon: str
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class YearlyGoalCreate(BaseModel):
    life_area_id: Optional[uuid.UUID] = None
    year: int
    title: str
    description: Optional[str] = None
    status: str = "active"
    progress: float = 0.0
    deadline_date: Optional[date] = None


class YearlyGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    life_area_id: Optional[uuid.UUID] = None
    deadline_date: Optional[date] = None


class YearlyGoalOut(BaseModel):
    id: uuid.UUID
    life_area_id: Optional[uuid.UUID]
    year: int
    title: str
    description: Optional[str]
    status: str
    progress: float
    deadline_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class MonthlyFocusCreate(BaseModel):
    yearly_goal_id: Optional[uuid.UUID] = None
    year: int
    month: int
    title: str
    description: Optional[str] = None
    deadline_date: Optional[date] = None


class MonthlyFocusUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reflection: Optional[str] = None
    yearly_goal_id: Optional[uuid.UUID] = None
    deadline_date: Optional[date] = None


class MonthlyFocusOut(BaseModel):
    id: uuid.UUID
    yearly_goal_id: Optional[uuid.UUID]
    year: int
    month: int
    title: str
    description: Optional[str]
    reflection: Optional[str]
    deadline_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class WeeklyPriorityCreate(BaseModel):
    monthly_focus_id: Optional[uuid.UUID] = None
    year: int
    week_number: int
    title: str
    description: Optional[str] = None
    deadline_date: Optional[date] = None


class WeeklyPriorityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    reflection: Optional[str] = None
    monthly_focus_id: Optional[uuid.UUID] = None
    deadline_date: Optional[date] = None


class WeeklyPriorityOut(BaseModel):
    id: uuid.UUID
    monthly_focus_id: Optional[uuid.UUID]
    year: int
    week_number: int
    title: str
    description: Optional[str]
    is_completed: bool
    reflection: Optional[str]
    deadline_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyTaskCreate(BaseModel):
    weekly_priority_id: Optional[uuid.UUID] = None
    task_date: date
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    estimated_minutes: Optional[int] = None
    tags: Optional[str] = None
    deadline_date: Optional[date] = None
    deadline_time: Optional[time] = None


class DailyTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    priority: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    tags: Optional[str] = None
    weekly_priority_id: Optional[uuid.UUID] = None
    deadline_date: Optional[date] = None
    deadline_time: Optional[time] = None


class DailyTaskOut(BaseModel):
    id: uuid.UUID
    weekly_priority_id: Optional[uuid.UUID]
    task_date: date
    title: str
    description: Optional[str]
    is_completed: bool
    priority: str
    estimated_minutes: Optional[int]
    actual_minutes: Optional[int]
    tags: Optional[str]
    deadline_date: Optional[date]
    deadline_time: Optional[time]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanningNoteCreate(BaseModel):
    note_date: Optional[date] = None
    week_number: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None
    content: str
    note_type: str = "daily"


class PlanningNoteOut(BaseModel):
    id: uuid.UUID
    note_date: Optional[date]
    week_number: Optional[int]
    month: Optional[int]
    year: Optional[int]
    content: str
    note_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
