"""
Auth service — registration, login, Google OAuth, and FastAPI auth dependencies.
Calls user_repository for DB access; utils.jwt and utils.password for pure functions.
"""

import urllib.parse

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app_config import settings
from database import User, get_db
from models.auth import TokenResponse, UserResponse
from repository import user_repository
from utils import jwt as jwt_utils
from utils import password as pwd_utils

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
_GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/google/callback"


def create_admin_if_not_exists(db: Session) -> None:
    existing = user_repository.find_by_username(db, settings.admin_username)
    if existing:
        if not existing.is_admin:
            existing.is_admin = True
            db.commit()
        return
    user_repository.create_user(
        db,
        username=settings.admin_username,
        email=settings.admin_email,
        hashed_password=pwd_utils.hash_password(settings.admin_password),
        is_admin=True,
    )
    print(f"Admin user '{settings.admin_username}' created.")


def register(db: Session, username: str, email: str, password: str) -> UserResponse:
    if user_repository.find_by_username(db, username):
        raise HTTPException(status_code=400, detail="Username is already taken.")
    if user_repository.find_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email is already registered.")
    user = user_repository.create_user(
        db, username=username, email=email,
        hashed_password=pwd_utils.hash_password(password),
    )
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        is_admin=user.is_admin, is_active=user.is_active,
    )


def login(db: Session, username: str, password: str) -> TokenResponse:
    user = user_repository.find_by_username(db, username)
    if not user or not pwd_utils.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled.",
        )
    token = jwt_utils.create_access_token({"sub": user.username})
    return TokenResponse(access_token=token, token_type="bearer")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt_utils.verify_token(token)
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = user_repository.find_by_username(db, username)
    if user is None:
        raise credentials_exc
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled.",
        )
    return user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


async def google_get_auth_url() -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    return _GOOGLE_AUTH_BASE + "?" + urllib.parse.urlencode(params)


async def google_handle_callback(code: str, db: Session) -> str:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": _GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    tokens = token_resp.json()
    if "access_token" not in tokens:
        raise HTTPException(status_code=400, detail="Google OAuth failed: no access token.")

    async with httpx.AsyncClient() as client:
        info_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
    google_user = info_resp.json()

    user = user_repository.find_or_create_google_user(db, google_user)
    return jwt_utils.create_access_token({"sub": user.username})
