import uuid
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.habits import Habit, HabitEntry
from app.schemas.habits import (
    HabitCreate, HabitUpdate, HabitOut,
    HabitEntryCreate, HabitEntryUpdate, HabitEntryOut,
    HabitWithEntries,
)

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("", response_model=list[HabitOut])
def list_habits(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(Habit).filter(Habit.user_id == user_id, Habit.is_deleted == False)
    if active_only:
        q = q.filter(Habit.is_active == True)
    return q.order_by(Habit.order_index).all()


@router.post("", response_model=HabitOut, status_code=201)
def create_habit(
    data: HabitCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = Habit(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{habit_id}", response_model=HabitOut)
def update_habit(
    habit_id: uuid.UUID,
    data: HabitUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{habit_id}", status_code=204)
def delete_habit(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()


# ── Entries ───────────────────────────────────────────────────────────────────

@router.get("/entries", response_model=list[HabitEntryOut])
def list_entries(
    habit_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(HabitEntry).filter(HabitEntry.user_id == user_id, HabitEntry.is_deleted == False)
    if habit_id:
        q = q.filter(HabitEntry.habit_id == habit_id)
    if from_date:
        q = q.filter(HabitEntry.entry_date >= from_date)
    if to_date:
        q = q.filter(HabitEntry.entry_date <= to_date)
    return q.order_by(HabitEntry.entry_date.desc()).all()


@router.post("/entries", response_model=HabitEntryOut, status_code=201)
def upsert_entry(
    data: HabitEntryCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    existing = db.query(HabitEntry).filter(
        HabitEntry.habit_id == data.habit_id,
        HabitEntry.entry_date == data.entry_date,
        HabitEntry.user_id == user_id,
        HabitEntry.is_deleted == False,
    ).first()
    if existing:
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    obj = HabitEntry(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{habit_id}/streak")
def get_streak(
    habit_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    entries = db.query(HabitEntry).filter(
        HabitEntry.habit_id == habit_id,
        HabitEntry.user_id == user_id,
        HabitEntry.completed == True,
        HabitEntry.is_deleted == False,
    ).order_by(HabitEntry.entry_date.desc()).all()

    if not entries:
        return {"current_streak": 0, "longest_streak": 0}

    dates = sorted({e.entry_date for e in entries}, reverse=True)
    today = date.today()

    current_streak = 0
    check = today
    for d in dates:
        if d == check or d == check - timedelta(days=1):
            current_streak += 1
            check = d
        else:
            break

    longest_streak = 1
    run = 1
    for i in range(1, len(dates)):
        if (dates[i - 1] - dates[i]).days == 1:
            run += 1
            longest_streak = max(longest_streak, run)
        else:
            run = 1

    return {"current_streak": current_streak, "longest_streak": longest_streak}
