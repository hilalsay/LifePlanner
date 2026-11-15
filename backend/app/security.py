"""Request hardening: rate limits, cross-site write protection, upload sniffing.

The backend runs as a single uvicorn process behind nginx, so in-memory limits
are enough here. nginx sets X-Real-IP to the client address.
"""
import time
from collections import defaultdict, deque
from typing import Optional

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import settings

# (method, path prefix) -> (max requests, window seconds), keyed per client IP.
# Login/register are per IP to slow password guessing and mass sign-ups;
# the LLM endpoints are per IP as well because they are the expensive ones.
_LIMITS: list[tuple[str, str, int, int]] = [
    ("POST", "/api/v1/auth/login", 10, 300),
    ("POST", "/api/v1/auth/register", 5, 3600),
    ("POST", "/api/v1/auth/refresh", 60, 300),
    ("POST", "/api/v1/auth/me/avatar", 10, 3600),
    ("POST", "/api/v1/ai/chat", 30, 300),
    ("POST", "/api/v1/ai/weekly-review", 10, 3600),
    ("POST", "/api/v1/ai/parse-task", 60, 300),
    ("GET", "/api/v1/tracking/books/search", 60, 300),
]

_hits: dict[tuple[str, str], deque] = defaultdict(deque)


def client_ip(request: Request) -> str:
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


def _limit_for(method: str, path: str) -> Optional[tuple[str, int, int]]:
    for m, prefix, n, window in _LIMITS:
        if method == m and path.startswith(prefix):
            return prefix, n, window
    return None


def check_rate_limit(request: Request) -> Optional[JSONResponse]:
    rule = _limit_for(request.method, request.url.path)
    if not rule:
        return None
    prefix, n, window = rule
    now = time.monotonic()
    q = _hits[(client_ip(request), prefix)]
    while q and q[0] <= now - window:
        q.popleft()
    if len(q) >= n:
        retry = int(q[0] + window - now) + 1
        return JSONResponse(
            {"detail": "Too many requests. Please wait a moment and try again."},
            status_code=429,
            headers={"Retry-After": str(retry)},
        )
    q.append(now)
    if len(_hits) > 50_000:  # bound memory under a flood of distinct IPs
        _hits.clear()
    return None


MAX_JSON_BODY = 256 * 1024  # planner data is small; uploads have their own cap


def check_body_size(request: Request) -> Optional[JSONResponse]:
    if request.url.path.startswith("/api/v1/auth/me/avatar"):
        return None
    try:
        size = int(request.headers.get("content-length") or 0)
    except ValueError:
        size = 0
    if size > MAX_JSON_BODY:
        return JSONResponse({"detail": "Request too large"}, status_code=413)
    return None


def allowed_origins() -> set[str]:
    origins = {"http://localhost:5173", "http://localhost:3000"}
    if settings.frontend_url:
        origins.add(settings.frontend_url.rstrip("/"))
    return origins


def check_origin(request: Request) -> Optional[JSONResponse]:
    """Reject state-changing requests sent from another site's page.

    SameSite=Lax cookies already stop most cross-site writes, but sibling
    subdomains count as the same site, so check Origin explicitly. Requests
    without an Origin header (curl, OAuth redirects) are not browser CSRF.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return None
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in allowed_origins():
        return JSONResponse({"detail": "Cross-site request blocked"}, status_code=403)
    return None


_IMAGE_SIGNATURES: list[tuple[bytes, int, str]] = [
    (b"\x89PNG\r\n\x1a\n", 0, ".png"),
    (b"\xff\xd8\xff", 0, ".jpg"),
    (b"GIF87a", 0, ".gif"),
    (b"GIF89a", 0, ".gif"),
]


def sniff_image(data: bytes) -> str:
    """Return the file extension for a real PNG/JPEG/GIF/WebP, or raise 400."""
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    for sig, offset, ext in _IMAGE_SIGNATURES:
        if data[offset:offset + len(sig)] == sig:
            if ext == ".png" and b"IEND" not in data[-16:]:
                break  # truncated or fake PNG
            return ext
    raise HTTPException(400, "File must be a PNG, JPEG, GIF or WebP image")


_DEFAULT_SECRETS = {"CHANGE_ME_USE_openssl_rand_-hex_32_IN_PRODUCTION", "CHANGE_ME_SESSION_SECRET"}


def assert_production_config() -> None:
    """Refuse to start in production with placeholder secrets or insecure cookies."""
    if settings.environment.lower() != "production":
        return
    problems = []
    if settings.jwt_secret_key in _DEFAULT_SECRETS or len(settings.jwt_secret_key) < 32:
        problems.append("JWT_SECRET_KEY")
    if settings.session_secret_key in _DEFAULT_SECRETS or len(settings.session_secret_key) < 32:
        problems.append("SESSION_SECRET_KEY")
    if not settings.cookie_secure:
        problems.append("COOKIE_SECURE")
    if problems:
        raise RuntimeError(f"Insecure production config, fix in .env: {', '.join(problems)}")
