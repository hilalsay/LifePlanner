import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.planning import DailyTask, WeeklyPriority, MonthlyFocus, PlanningNote
from app.models.habits import Habit, HabitEntry
from app.models.tracking import MoodEntry, WeeklyAIReview
from app.models.chat import Conversation, ChatMessage
from app.schemas.tracking import WeeklyAIReviewOut
from app.schemas.chat import (
    ConversationOut,
    ConversationDetailOut,
    ChatRequest,
    ChatResponse,
)
from app.services.ai_service import (
    generate_motivational_message,
    generate_weekly_review,
    parse_natural_language_task,
    chat_with_assistant,
)
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


# ── Conversations ──────────────────────────────────────────────────────────

@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return db.query(Conversation).filter(
        Conversation.user_id == user_id,
        Conversation.is_deleted == False,
    ).order_by(Conversation.updated_at.desc()).all()


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
        Conversation.is_deleted == False,
    ).first()
    if not convo:
        raise HTTPException(404, "Conversation not found")
    return convo


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
        Conversation.is_deleted == False,
    ).first()
    if not convo:
        raise HTTPException(404, "Conversation not found")
    convo.is_deleted = True
    db.commit()


def _plan_context(db: Session, user_id: uuid.UUID) -> dict:
    today = date.today()
    iso = today.isocalendar()
    year, week = iso.year, iso.week

    monthly = db.query(MonthlyFocus).filter(
        MonthlyFocus.user_id == user_id,
        MonthlyFocus.year == today.year,
        MonthlyFocus.month == today.month,
        MonthlyFocus.is_deleted == False,
    ).all()
    weekly = db.query(WeeklyPriority).filter(
        WeeklyPriority.user_id == user_id,
        WeeklyPriority.year == year,
        WeeklyPriority.week_number == week,
        WeeklyPriority.is_deleted == False,
    ).all()
    habits = db.query(Habit).filter(
        Habit.user_id == user_id,
        Habit.is_active == True,
        Habit.is_deleted == False,
    ).all()
    tasks = db.query(DailyTask).filter(
        DailyTask.user_id == user_id,
        DailyTask.task_date == today,
        DailyTask.is_deleted == False,
    ).all()

    return {
        "monthly": ", ".join(m.title for m in monthly),
        "weekly": ", ".join(p.title for p in weekly),
        "habits": ", ".join(h.name for h in habits),
        "tasks": ", ".join(t.title for t in tasks),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    content = (req.content or "").strip()
    if not content:
        raise HTTPException(400, "content is required")

    # Resolve (or create) the conversation.
    if req.conversation_id:
        convo = db.query(Conversation).filter(
            Conversation.id == req.conversation_id,
            Conversation.user_id == user_id,
            Conversation.is_deleted == False,
        ).first()
        if not convo:
            raise HTTPException(404, "Conversation not found")
    else:
        convo = Conversation(user_id=user_id, title=content[:60])
        db.add(convo)
        db.flush()  # assign id

    # Build history from stored messages (the DB is the source of truth).
    history = [
        {"role": m.role, "content": m.content}
        for m in db.query(ChatMessage).filter(
            ChatMessage.conversation_id == convo.id,
            ChatMessage.is_deleted == False,
        ).order_by(ChatMessage.created_at).all()
    ]
    history.append({"role": "user", "content": content})

    # Persist the user's message.
    db.add(ChatMessage(user_id=user_id, conversation_id=convo.id, role="user", content=content))

    # Call the model with the plan context.
    result = await chat_with_assistant(history, _plan_context(db, user_id))

    # Persist the assistant's reply (with its suggestions).
    db.add(ChatMessage(
        user_id=user_id,
        conversation_id=convo.id,
        role="assistant",
        content=result["message"],
        suggestions=result["suggestions"] or None,
    ))
    # Touch the conversation so it sorts to the top of the history list.
    convo.updated_at = func.now()
    db.commit()
    db.refresh(convo)

    return ChatResponse(
        conversation_id=convo.id,
        title=convo.title,
        message=result["message"],
        suggestions=result["suggestions"],
    )


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
