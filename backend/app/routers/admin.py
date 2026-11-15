"""Admin-only usage analytics. Exposes counts and timestamps, never user content."""
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])

# (key, table, extra WHERE) — what each user has created, by feature.
CONTENT: list[tuple[str, str, str]] = [
    ("tasks", "daily_tasks", ""),
    ("weekly", "weekly_priorities", ""),
    ("monthly", "monthly_focuses", ""),
    ("yearly_goals", "yearly_goals", ""),
    ("life_areas", "life_areas", ""),
    ("notes", "planning_notes", ""),
    ("habits", "habits", ""),
    ("habit_checkins", "habit_entries", "AND completed"),
    ("mood", "mood_entries", ""),
    ("health", "health_entries", ""),
    ("reading", "book_entries", ""),
    ("ai_conversations", "conversations", ""),
    ("ai_messages", "chat_messages", "AND role = 'user'"),
    ("ai_reviews", "weekly_ai_reviews", ""),
]


def require_admin(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if not user or not user.is_active or not user.is_admin:
        raise HTTPException(403, "Admin only")
    return user


def _window(days: int) -> date:
    return datetime.now(timezone.utc).date() - timedelta(days=days - 1)


def _content_by_user(db: Session, since: date, user_id: Optional[uuid.UUID] = None) -> dict:
    """{user_id: {key: {"count", "recent", "last_at"}}}"""
    out: dict = {}
    for key, table, extra in CONTENT:
        where = "WHERE TRUE " + extra + (" AND user_id = :uid" if user_id else "")
        rows = db.execute(text(f"""
            SELECT user_id, count(*), count(*) FILTER (WHERE created_at >= :since), max(updated_at)
            FROM {table} {where} GROUP BY user_id
        """), {"since": since, "uid": user_id}).all()
        for uid, n, recent, last_at in rows:
            out.setdefault(uid, {})[key] = {"count": n, "recent": recent, "last_at": last_at}
    return out


def _last_active(user: User, content: dict) -> Optional[datetime]:
    stamps = [c["last_at"] for c in content.values() if c["last_at"]]
    if user.last_seen_at:
        stamps.append(user.last_seen_at)
    return max(stamps) if stamps else None


@router.get("/overview")
def overview(days: int = Query(30, ge=1, le=365), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    since = _window(days)
    now = datetime.now(timezone.utc)
    users = db.query(User).all()
    content = _content_by_user(db, since)
    last_active = {u.id: _last_active(u, content.get(u.id, {})) for u in users}

    def active_within(d: int) -> int:
        cutoff = now - timedelta(days=d)
        return sum(1 for t in last_active.values() if t and t >= cutoff)

    signups: dict[date, int] = {}
    for u in users:
        d = u.created_at.date()
        if d >= since:
            signups[d] = signups.get(d, 0) + 1

    daily = db.execute(text("""
        SELECT day, count(DISTINCT user_id), sum(views), sum(actions)
        FROM user_activity WHERE day >= :since GROUP BY day ORDER BY day
    """), {"since": since}).all()
    features = db.execute(text("""
        SELECT feature, count(DISTINCT user_id), sum(views), sum(actions)
        FROM user_activity WHERE day >= :since GROUP BY feature
        ORDER BY count(DISTINCT user_id) DESC, sum(actions) DESC
    """), {"since": since}).all()
    tracking_since = db.execute(text("SELECT min(day) FROM user_activity")).scalar()

    adoption = []
    for key, _t, _e in CONTENT:
        per_user = [c[key] for c in content.values() if key in c]
        adoption.append({
            "key": key,
            "users": len(per_user),
            "users_recent": sum(1 for c in per_user if c["recent"]),
            "items": sum(c["count"] for c in per_user),
            "items_recent": sum(c["recent"] for c in per_user),
        })

    days_list = [since + timedelta(days=i) for i in range(days)]
    daily_map = {r[0]: r for r in daily}
    return {
        "days": days,
        "tracking_since": tracking_since,
        "totals": {
            "users": len(users),
            "new_users": sum(signups.values()),
            "active_1d": active_within(1),
            "active_7d": active_within(7),
            "active_30d": active_within(30),
            "never_used": sum(1 for u in users if not content.get(u.id)),
        },
        "series": [
            {
                "day": d,
                "signups": signups.get(d, 0),
                "active_users": daily_map[d][1] if d in daily_map else 0,
                "actions": int(daily_map[d][3]) if d in daily_map else 0,
            }
            for d in days_list
        ],
        "features": [{"feature": f, "users": u, "views": int(v), "actions": int(a)} for f, u, v, a in features],
        "adoption": sorted(adoption, key=lambda a: -a["users"]),
    }


@router.get("/users")
def list_users(days: int = Query(30, ge=1, le=365), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    since = _window(days)
    content = _content_by_user(db, since)
    stats = {
        uid: (active_days, views, actions)
        for uid, active_days, views, actions in db.execute(text("""
            SELECT user_id, count(DISTINCT day), sum(views), sum(actions)
            FROM user_activity WHERE day >= :since GROUP BY user_id
        """), {"since": since}).all()
    }
    top = {
        uid: feature
        for uid, feature in db.execute(text("""
            SELECT DISTINCT ON (user_id) user_id, feature FROM user_activity
            WHERE day >= :since AND feature <> 'app_open'
            GROUP BY user_id, feature ORDER BY user_id, sum(actions + views) DESC
        """), {"since": since}).all()
    }
    out = []
    for u in db.query(User).all():
        c = content.get(u.id, {})
        active_days, views, actions = stats.get(u.id, (0, 0, 0))
        out.append({
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "provider": u.provider,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "last_seen_at": u.last_seen_at,
            "last_active_at": _last_active(u, c),
            "active_days": active_days,
            "views": int(views or 0),
            "actions": int(actions or 0),
            "top_feature": top.get(u.id),
            "content": {k: v["count"] for k, v in c.items()},
            "total_items": sum(v["count"] for v in c.values()),
        })
    out.sort(key=lambda r: r["last_active_at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return out


@router.get("/users/{user_id}")
def user_detail(user_id: uuid.UUID, days: int = Query(30, ge=1, le=365), _: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    since = _window(days)
    content = _content_by_user(db, since, user_id).get(user_id, {})
    features = db.execute(text("""
        SELECT feature, count(DISTINCT day), sum(views), sum(actions), max(day)
        FROM user_activity WHERE user_id = :uid AND day >= :since
        GROUP BY feature ORDER BY sum(actions + views) DESC
    """), {"uid": user_id, "since": since}).all()
    daily = {
        d: (int(v), int(a))
        for d, v, a in db.execute(text("""
            SELECT day, sum(views), sum(actions) FROM user_activity
            WHERE user_id = :uid AND day >= :since GROUP BY day
        """), {"uid": user_id, "since": since}).all()
    }
    return {
        "user": {
            "id": user.id, "email": user.email, "display_name": user.display_name,
            "provider": user.provider, "is_admin": user.is_admin, "created_at": user.created_at,
            "last_seen_at": user.last_seen_at, "last_active_at": _last_active(user, content),
        },
        "content": [
            {"key": k, "count": content[k]["count"], "recent": content[k]["recent"], "last_at": content[k]["last_at"]}
            for k, _t, _e in CONTENT if k in content
        ],
        "features": [
            {"feature": f, "active_days": d, "views": int(v), "actions": int(a), "last_day": last}
            for f, d, v, a, last in features
        ],
        "series": [
            {"day": since + timedelta(days=i),
             "views": daily.get(since + timedelta(days=i), (0, 0))[0],
             "actions": daily.get(since + timedelta(days=i), (0, 0))[1]}
            for i in range(days)
        ],
    }
