import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.tracking import MoodEntry, HealthEntry, BookEntry
from app.schemas.tracking import (
    MoodEntryCreate, MoodEntryUpdate, MoodEntryOut,
    HealthEntryCreate, HealthEntryUpdate, HealthEntryOut,
    BookEntryCreate, BookEntryUpdate, BookEntryOut,
)

router = APIRouter(prefix="/tracking", tags=["tracking"])


# ── Mood ──────────────────────────────────────────────────────────────────────

@router.get("/mood", response_model=list[MoodEntryOut])
def list_mood(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(MoodEntry).filter(MoodEntry.user_id == user_id, MoodEntry.is_deleted == False)
    if from_date:
        q = q.filter(MoodEntry.entry_date >= from_date)
    if to_date:
        q = q.filter(MoodEntry.entry_date <= to_date)
    return q.order_by(MoodEntry.entry_date.desc()).all()


@router.post("/mood", response_model=MoodEntryOut, status_code=201)
def create_mood(
    data: MoodEntryCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    existing = db.query(MoodEntry).filter(
        MoodEntry.entry_date == data.entry_date,
        MoodEntry.user_id == user_id,
        MoodEntry.is_deleted == False,
    ).first()
    if existing:
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    obj = MoodEntry(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/mood/{entry_id}", response_model=MoodEntryOut)
def update_mood(
    entry_id: uuid.UUID,
    data: MoodEntryUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(MoodEntry).filter(MoodEntry.id == entry_id, MoodEntry.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=list[HealthEntryOut])
def list_health(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(HealthEntry).filter(HealthEntry.user_id == user_id, HealthEntry.is_deleted == False)
    if from_date:
        q = q.filter(HealthEntry.entry_date >= from_date)
    if to_date:
        q = q.filter(HealthEntry.entry_date <= to_date)
    return q.order_by(HealthEntry.entry_date.desc()).all()


@router.post("/health", response_model=HealthEntryOut, status_code=201)
def upsert_health(
    data: HealthEntryCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    existing = db.query(HealthEntry).filter(
        HealthEntry.entry_date == data.entry_date,
        HealthEntry.user_id == user_id,
        HealthEntry.is_deleted == False,
    ).first()
    if existing:
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    obj = HealthEntry(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/health/{entry_id}", response_model=HealthEntryOut)
def update_health(
    entry_id: uuid.UUID,
    data: HealthEntryUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(HealthEntry).filter(HealthEntry.id == entry_id, HealthEntry.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ── Books ─────────────────────────────────────────────────────────────────────

@router.get("/books", response_model=list[BookEntryOut])
def list_books(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    q = db.query(BookEntry).filter(BookEntry.user_id == user_id, BookEntry.is_deleted == False)
    if status:
        q = q.filter(BookEntry.status == status)
    return q.order_by(BookEntry.created_at.desc()).all()


@router.post("/books", response_model=BookEntryOut, status_code=201)
def create_book(
    data: BookEntryCreate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = BookEntry(**data.model_dump(), user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/books/{book_id}", response_model=BookEntryOut)
def update_book(
    book_id: uuid.UUID,
    data: BookEntryUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(BookEntry).filter(BookEntry.id == book_id, BookEntry.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/books/{book_id}", status_code=204)
def delete_book(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    obj = db.query(BookEntry).filter(BookEntry.id == book_id, BookEntry.user_id == user_id).first()
    if not obj:
        raise HTTPException(404, "Not found")
    obj.is_deleted = True
    db.commit()
