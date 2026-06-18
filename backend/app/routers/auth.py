import uuid
from typing import Optional

import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut, UserUpdate
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()

if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if settings.github_client_id and settings.github_client_secret:
    oauth.register(
        name="github",
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email"},
    )


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.access_token_expire_minutes * 60,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/api/v1/auth",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth")


def _get_or_create_oauth_user(
    db: Session,
    provider: str,
    provider_id: str,
    email: str,
    display_name: Optional[str],
    avatar_url: Optional[str],
) -> User:
    user = db.query(User).filter(User.provider == provider, User.provider_id == provider_id).first()
    if user:
        return user
    # check if email already exists (different provider)
    user = db.query(User).filter(User.email == email).first()
    if user:
        # link existing account
        user.provider_id = provider_id
        db.commit()
        return user
    user = User(
        email=email,
        provider=provider,
        provider_id=provider_id,
        display_name=display_name,
        avatar_url=avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Email/Password ────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut)
def register(data: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    if len(data.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        provider="email",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    set_auth_cookies(response, create_access_token(user.id), create_refresh_token(user.id))
    return user


@router.post("/login", response_model=UserOut)
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    set_auth_cookies(response, create_access_token(user.id), create_refresh_token(user.id))
    return user


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    from app.services.auth_service import decode_access_token
    if not access_token:
        raise HTTPException(401, "Not authenticated")
    user_id = decode_access_token(access_token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    data: UserUpdate,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    from app.services.auth_service import decode_access_token
    if not access_token:
        raise HTTPException(401, "Not authenticated")
    user_id = decode_access_token(access_token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(401, "User not found")

    updates = data.model_dump(exclude_unset=True)
    if "display_name" in updates:
        dn = (updates["display_name"] or "").strip()
        user.display_name = dn or None
    if "avatar_url" in updates:
        au = (updates["avatar_url"] or "").strip()
        user.avatar_url = au or None
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    import os
    import uuid as _uuid
    from pathlib import Path
    from app.services.auth_service import decode_access_token

    if not access_token:
        raise HTTPException(401, "Not authenticated")
    user_id = decode_access_token(access_token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(401, "User not found")

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "File must be an image")

    ext_map = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}
    ext = ext_map.get(file.content_type, ".png")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:  # 5 MB cap
        raise HTTPException(400, "Image must be under 5 MB")

    avatars_dir = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)

    # Remove any previous avatar files for this user, then write the new one.
    for old in avatars_dir.glob(f"{user_id}-*"):
        try:
            old.unlink()
        except OSError:
            pass

    filename = f"{user_id}-{_uuid.uuid4().hex[:8]}{ext}"
    (avatars_dir / filename).write_bytes(data)

    user.avatar_url = f"/api/v1/uploads/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return user


@router.post("/refresh")
def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(401, "No refresh token")
    user_id = decode_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired refresh token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(401, "User not found")
    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    set_auth_cookies(response, new_access, new_refresh)
    return {"message": "Token refreshed"}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google")
async def google_login(request: Request):
    if not settings.google_client_id:
        raise HTTPException(503, "Google OAuth not configured")
    redirect_uri = f"{settings.backend_url}/api/v1/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(503, "Google OAuth not configured")
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or {}
        email = user_info.get("email")
        if not email:
            raise HTTPException(400, "No email from Google")
        user = _get_or_create_oauth_user(
            db,
            provider="google",
            provider_id=user_info.get("sub", ""),
            email=email,
            display_name=user_info.get("name"),
            avatar_url=user_info.get("picture"),
        )
    except Exception as e:
        return RedirectResponse(f"{settings.frontend_url}/login?error=oauth_failed")
    resp = RedirectResponse(url=settings.frontend_url)
    set_auth_cookies(resp, create_access_token(user.id), create_refresh_token(user.id))
    return resp


# ── GitHub OAuth ──────────────────────────────────────────────────────────────

@router.get("/github")
async def github_login(request: Request):
    if not settings.github_client_id:
        raise HTTPException(503, "GitHub OAuth not configured")
    redirect_uri = f"{settings.backend_url}/api/v1/auth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    if not settings.github_client_id:
        raise HTTPException(503, "GitHub OAuth not configured")
    try:
        token = await oauth.github.authorize_access_token(request)
        # fetch user profile
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token['access_token']}", "Accept": "application/json"}
            user_resp = await client.get("https://api.github.com/user", headers=headers)
            user_data = user_resp.json()
            # fetch emails if primary not public
            email = user_data.get("email")
            if not email:
                emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
                email = primary["email"] if primary else None
        if not email:
            return RedirectResponse(f"{settings.frontend_url}/login?error=no_email")
        user = _get_or_create_oauth_user(
            db,
            provider="github",
            provider_id=str(user_data.get("id", "")),
            email=email,
            display_name=user_data.get("name") or user_data.get("login"),
            avatar_url=user_data.get("avatar_url"),
        )
    except Exception as e:
        return RedirectResponse(f"{settings.frontend_url}/login?error=oauth_failed")
    resp = RedirectResponse(url=settings.frontend_url)
    set_auth_cookies(resp, create_access_token(user.id), create_refresh_token(user.id))
    return resp
