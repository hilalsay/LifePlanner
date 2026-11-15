import uuid
from datetime import date
from sqlalchemy import Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class UserActivity(Base):
    """Per-user, per-day, per-feature request counters (written by the activity middleware).

    Only counts are stored, never request content.
    """
    __tablename__ = "user_activity"

    user_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    feature: Mapped[str] = mapped_column(String(64), primary_key=True)
    views: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    actions: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
