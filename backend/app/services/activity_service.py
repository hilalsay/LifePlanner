"""Lightweight usage tracking for the admin panel.

Every successful authenticated API call bumps a (user, day, feature) counter:
GET requests count as views, writes (POST/PATCH/PUT/DELETE) as actions.
Only counters are stored, never request bodies or content.
"""
import asyncio
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text

from app.database import engine

log = logging.getLogger(__name__)

API_PREFIX = "/api/v1/"
_ID_RE = re.compile(r"^[0-9a-fA-F-]{32,36}$|^\d+$")

# Longest prefix wins. Keys are API paths with ids removed.
FEATURE_MAP: dict[str, str] = {
    "planning/daily-tasks": "tasks",
    "planning/weekly-priorities": "weekly",
    "planning/monthly-focuses": "monthly",
    "planning/yearly-goals": "yearly_goals",
    "planning/life-areas": "life_areas",
    "planning": "planning_other",
    "habits": "habits",
    "tracking/mood": "mood",
    "tracking/health": "health",
    "tracking/books": "reading",
    "ai/chat": "ai_chat",
    "ai/conversations": "ai_chat",
    "ai/weekly-review": "ai_review",
    "ai/weekly-reviews": "ai_review",
    "ai/parse-task": "quick_add",
    "ai/motivational": "motivational",
}

_UPSERT = text("""
    INSERT INTO user_activity (user_id, day, feature, views, actions)
    VALUES (:user_id, :day, :feature, :views, :actions)
    ON CONFLICT (user_id, day, feature) DO UPDATE
    SET views = user_activity.views + EXCLUDED.views,
        actions = user_activity.actions + EXCLUDED.actions
""")
_SEEN = text("""
    UPDATE users SET last_seen_at = :now
    WHERE id = :user_id AND (last_seen_at IS NULL OR last_seen_at < :now - interval '1 minute')
""")


def feature_for(method: str, path: str) -> Optional[str]:
    """Map a request to a feature name, or None if it should not be tracked."""
    if not path.startswith(API_PREFIX):
        return None
    segs = [s for s in path[len(API_PREFIX):].split("/") if s and not _ID_RE.match(s)]
    if not segs:
        return None
    if segs[0] == "auth":
        # Loading /auth/me is what the app does on every open: a good "session" signal.
        return "app_open" if method == "GET" and segs[1:] == ["me"] else None
    if segs[0] in ("admin", "uploads"):
        return None
    for n in (2, 1):
        key = "/".join(segs[:n])
        if key in FEATURE_MAP:
            return FEATURE_MAP[key]
    return "/".join(segs[:2])[:64]


def _record(user_id: uuid.UUID, feature: str, is_write: bool) -> None:
    now = datetime.now(timezone.utc)
    try:
        with engine.begin() as conn:
            conn.execute(_UPSERT, {
                "user_id": user_id, "day": now.date(), "feature": feature,
                "views": 0 if is_write else 1, "actions": 1 if is_write else 0,
            })
            conn.execute(_SEEN, {"user_id": user_id, "now": now})
    except Exception:  # tracking must never break the app
        log.exception("activity tracking failed")


def track(user_id: uuid.UUID, method: str, path: str) -> None:
    """Fire-and-forget: record the hit on a worker thread."""
    feature = feature_for(method, path)
    if not feature:
        return
    is_write = method in ("POST", "PUT", "PATCH", "DELETE")
    asyncio.get_running_loop().run_in_executor(None, _record, user_id, feature, is_write)
