import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.planning import LifeArea, YearlyGoal, MonthlyFocus, WeeklyPriority, DailyTask, PlanningNote
from app.schemas.planning import (
    LifeAreaCreate, LifeAreaUpdate, LifeAreaOut,
    YearlyGoalCreate, YearlyGoalUpdate, YearlyGoalOut,
    MonthlyFocusCreate, MonthlyFocusUpdate, MonthlyFocusOut,
    WeeklyPriorityCreate, WeeklyPriorityUpdate, WeeklyPriorityOut,
    DailyTaskCreate, DailyTaskUpdate, DailyTaskOut,
    PlanningNoteCreate, PlanningNoteOut,
)

router = APIRouter(prefix="/planning", tags=["planning"])


# ── Life Areas ──────────────────────────────────────────────────────────────

@router.get("/life-areas", response_model=list[LifeAreaOut])
def list_life_areas(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return db.query(LifeArea).filter(
        LifeArea.user_id == user_id, LifeArea.is_deleted == False
    ).order_by(LifeArea.order_index).all()


@router.post("/life-areas", response_model=LifeAreaOut, status_code=201)
def create_life_area(
    data: LifeAreaCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = LifeArea(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/life-areas/{area_id}", response_model=LifeAreaOut)
def update_life_area(
    area_id: uuid.UUID,
    data: LifeAreaUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(LifeArea).filter(LifeArea.id == area_id, LifeArea.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/life-areas/{area_id}", status_code=204)
def delete_life_area(
    area_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(LifeArea).filter(LifeArea.id == area_id, LifeArea.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()


# ── Yearly Goals ─────────────────────────────────────────────────────────────

@router.get("/yearly-goals", response_model=list[YearlyGoalOut])
def list_yearly_goals(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(YearlyGoal).filter(YearlyGoal.user_id == user_id, YearlyGoal.is_deleted == False)
    if year:
        q = q.filter(YearlyGoal.year == year)
    return q.all()


@router.post("/yearly-goals", response_model=YearlyGoalOut, status_code=201)
def create_yearly_goal(
    data: YearlyGoalCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = YearlyGoal(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/yearly-goals/{goal_id}", response_model=YearlyGoalOut)
def update_yearly_goal(
    goal_id: uuid.UUID,
    data: YearlyGoalUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(YearlyGoal).filter(YearlyGoal.id == goal_id, YearlyGoal.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/yearly-goals/{goal_id}", status_code=204)
def delete_yearly_goal(
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(YearlyGoal).filter(YearlyGoal.id == goal_id, YearlyGoal.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()


# ── Monthly Focus ─────────────────────────────────────────────────────────────

@router.get("/monthly-focuses", response_model=list[MonthlyFocusOut])
def list_monthly_focuses(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(MonthlyFocus).filter(MonthlyFocus.user_id == user_id, MonthlyFocus.is_deleted == False)
    if year:
        q = q.filter(MonthlyFocus.year == year)
    if month:
        q = q.filter(MonthlyFocus.month == month)
    return q.all()


@router.post("/monthly-focuses", response_model=MonthlyFocusOut, status_code=201)
def create_monthly_focus(
    data: MonthlyFocusCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = MonthlyFocus(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/monthly-focuses/{focus_id}", response_model=MonthlyFocusOut)
def update_monthly_focus(
    focus_id: uuid.UUID,
    data: MonthlyFocusUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(MonthlyFocus).filter(MonthlyFocus.id == focus_id, MonthlyFocus.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/monthly-focuses/{focus_id}", status_code=204)
def delete_monthly_focus(
    focus_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(MonthlyFocus).filter(MonthlyFocus.id == focus_id, MonthlyFocus.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()


# ── Weekly Priorities ─────────────────────────────────────────────────────────

@router.get("/weekly-priorities", response_model=list[WeeklyPriorityOut])
def list_weekly_priorities(
    year: Optional[int] = Query(None),
    week_number: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(WeeklyPriority).filter(WeeklyPriority.user_id == user_id, WeeklyPriority.is_deleted == False)
    if year:
        q = q.filter(WeeklyPriority.year == year)
    if week_number:
        q = q.filter(WeeklyPriority.week_number == week_number)
    return q.all()


@router.post("/weekly-priorities", response_model=WeeklyPriorityOut, status_code=201)
def create_weekly_priority(
    data: WeeklyPriorityCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = WeeklyPriority(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/weekly-priorities/{priority_id}", response_model=WeeklyPriorityOut)
def update_weekly_priority(
    priority_id: uuid.UUID,
    data: WeeklyPriorityUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(WeeklyPriority).filter(WeeklyPriority.id == priority_id, WeeklyPriority.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/weekly-priorities/{priority_id}", status_code=204)
def delete_weekly_priority(
    priority_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(WeeklyPriority).filter(WeeklyPriority.id == priority_id, WeeklyPriority.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()


# ── Daily Tasks ───────────────────────────────────────────────────────────────

@router.get("/daily-tasks", response_model=list[DailyTaskOut])
def list_daily_tasks(
    task_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(DailyTask).filter(DailyTask.user_id == user_id, DailyTask.is_deleted == False)
    if task_date:
        q = q.filter(DailyTask.task_date == task_date)
    return q.order_by(DailyTask.created_at).all()


@router.post("/daily-tasks", response_model=DailyTaskOut, status_code=201)
def create_daily_task(
    data: DailyTaskCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = DailyTask(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/daily-tasks/{task_id}", response_model=DailyTaskOut)
def update_daily_task(
    task_id: uuid.UUID,
    data: DailyTaskUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/daily-tasks/{task_id}", status_code=204)
def delete_daily_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()


# ── Planning Notes ────────────────────────────────────────────────────────────

@router.get("/notes", response_model=list[PlanningNoteOut])
def list_notes(
    note_type: Optional[str] = Query(None),
    note_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(PlanningNote).filter(PlanningNote.user_id == user_id, PlanningNote.is_deleted == False)
    if note_type:
        q = q.filter(PlanningNote.note_type == note_type)
    if note_date:
        q = q.filter(PlanningNote.note_date == note_date)
    return q.order_by(PlanningNote.created_at.desc()).all()


@router.post("/notes", response_model=PlanningNoteOut, status_code=201)
def create_note(
    data: PlanningNoteCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = PlanningNote(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(PlanningNote).filter(PlanningNote.id == note_id, PlanningNote.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()
