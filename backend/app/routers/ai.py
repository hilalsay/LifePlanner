import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.planning import DailyTask, WeeklyPriority, PlanningNote
from app.models.habits import Habit, HabitEntry
from app.models.tracking import MoodEntry, WeeklyAIReview
from app.schemas.tracking import WeeklyAIReviewOut
from app.services.ai_service import generate_motivational_message, generate_weekly_review, parse_natural_language_task
from app.services.motivational import get_local_message

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/motivational")
async def motivational_message(ai: bool = True):
    if not ai:
        return {"message": get_local_message(), "source": "local"}
    message = await generate_motivational_message()
    return {"message": message, "source": "ai"}


@router.post("/parse-task")
async def parse_task(body: dict):
    text = body.get("text", "")
    if not text:
        return {"error": "text field required"}
    result = await parse_natural_language_task(text)
    return result


@router.post("/weekly-review", response_model=WeeklyAIReviewOut)
async def generate_review(
    body: dict = {},
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    today = date.today()
    iso = today.isocalendar()
    year, week = iso.year, iso.week

    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    tasks = db.query(DailyTask).filter(
        DailyTask.user_id == user_id,
        DailyTask.task_date >= week_start,
        DailyTask.task_date <= week_end,
        DailyTask.is_deleted == False,
    ).all()

    priorities = db.query(WeeklyPriority).filter(
        WeeklyPriority.user_id == user_id,
        WeeklyPriority.year == year,
        WeeklyPriority.week_number == week,
        WeeklyPriority.is_deleted == False,
    ).all()

    mood_entries = db.query(MoodEntry).filter(
        MoodEntry.user_id == user_id,
        MoodEntry.entry_date >= week_start,
        MoodEntry.entry_date <= week_end,
        MoodEntry.is_deleted == False,
    ).all()

    habits = db.query(Habit).filter(
        Habit.user_id == user_id,
        Habit.is_active == True,
        Habit.is_deleted == False,
    ).all()

    habit_entries = db.query(HabitEntry).filter(
        HabitEntry.user_id == user_id,
        HabitEntry.entry_date >= week_start,
        HabitEntry.entry_date <= week_end,
        HabitEntry.completed == True,
        HabitEntry.is_deleted == False,
    ).all()

    week_data = {
        "total_tasks": len(tasks),
        "completed_tasks": sum(1 for t in tasks if t.is_completed),
        "priorities": [p.title for p in priorities],
        "avg_mood": round(sum(m.mood_score for m in mood_entries) / len(mood_entries), 1) if mood_entries else None,
        "avg_energy": round(sum(m.energy_score for m in mood_entries) / len(mood_entries), 1) if mood_entries else None,
        "active_habits": [h.name for h in habits],
        "habit_completions": len(habit_entries),
    }

    content = await generate_weekly_review(week_data)

    review = WeeklyAIReview(
        user_id=user_id,
        year=year,
        week_number=week,
        content=content,
        model_used="claude",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/weekly-reviews", response_model=list[WeeklyAIReviewOut])
def list_reviews(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return db.query(WeeklyAIReview).filter(
        WeeklyAIReview.user_id == user_id,
        WeeklyAIReview.is_deleted == False,
    ).order_by(WeeklyAIReview.created_at.desc()).limit(20).all()
