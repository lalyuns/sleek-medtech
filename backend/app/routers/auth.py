from datetime import datetime, timedelta
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
import redis as redis_lib

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, LogoutRequest, RefreshRequest

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)


def _create_token(user_id: int, role: str, expire_hours: int, token_type: str = "access") -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "type": token_type,
        "jti": str(uuid4()),
        "exp": datetime.utcnow() + timedelta(hours=expire_hours),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_deleted == False).first()
    if not user or not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token = _create_token(user.user_id, user.role.value, settings.JWT_EXPIRE_HOURS, "access")
    refresh_token = _create_token(user.user_id, user.role.value, expire_hours=7 * 24, token_type="refresh")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutRequest):
    redis_client.setex(f"blacklist:{body.refresh_token}", 7 * 24 * 3600, "1")


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    if redis_client.exists(f"blacklist:{body.refresh_token}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    try:
        payload = jwt.decode(body.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None or payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    redis_client.setex(f"blacklist:{body.refresh_token}", 7 * 24 * 3600, "1")
    access_token = _create_token(user.user_id, user.role.value, settings.JWT_EXPIRE_HOURS, "access")
    refresh_token = _create_token(user.user_id, user.role.value, expire_hours=7 * 24, token_type="refresh")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
