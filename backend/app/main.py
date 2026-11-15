from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import planning, habits, tracking, ai, auth, admin
from app.services.activity_service import track
from app.services.auth_service import decode_access_token

app = FastAPI(title="Life Planner API", version="0.1.0")

# Local uploads (e.g. avatars), served under the /api prefix so the dev proxy reaches it.
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
(UPLOAD_DIR / "avatars").mkdir(parents=True, exist_ok=True)



@app.middleware("http")
async def track_activity(request: Request, call_next):
    response = await call_next(request)
    token = request.cookies.get("access_token")
    if token and response.status_code < 400 and request.method != "OPTIONS":
        user_id = decode_access_token(token)
        if user_id:
            track(user_id, request.method, request.url.path)
    return response


app.add_middleware(SessionMiddleware, secret_key=settings.session_secret_key)

_cors_origins = ["http://localhost:5173", "http://localhost:3000"]
if settings.frontend_url and settings.frontend_url not in _cors_origins:
    _cors_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(planning.router, prefix="/api/v1")
app.include_router(habits.router, prefix="/api/v1")
app.include_router(tracking.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

app.mount("/api/v1/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
