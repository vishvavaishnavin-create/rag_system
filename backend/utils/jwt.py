from datetime import datetime, timedelta, timezone

from jose import jwt

from app_config import settings


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload["exp"] = expire
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def verify_token(token: str) -> dict:
    """Decode and return JWT payload. Raises jose.JWTError on failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
