import uuid
from typing import Optional
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import decode_access_token


def get_current_user_id(
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> uuid.UUID:
    if not access_token:
        raise HTTPException(401, "Not authenticated")
    user_id = decode_access_token(access_token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token")
    return user_id
