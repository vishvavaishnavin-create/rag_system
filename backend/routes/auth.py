from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app_config import settings
from database import User, get_db
from models.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from repository import auth as auth_repo
from services.auth import (
    get_current_user,
    google_get_auth_url,
    google_handle_callback,
    login,
    register,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register_route(body: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    return register(db, body.username, body.email, body.password)


@router.post("/login", response_model=TokenResponse)
def login_route(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return login(db, body.username, body.password)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_admin=bool(current_user.is_admin),
        is_active=bool(current_user.is_active),
        has_seen_tour=bool(current_user.has_seen_tour),
        avatar_url=current_user.avatar_url,
        auth_provider=current_user.auth_provider or "local",
    )


@router.patch("/tour-complete")
def tour_complete(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    auth_repo.update_tour_seen(db, current_user.id)
    return {"status": "ok"}


@router.get("/google")
async def google_login() -> dict:
    url = await google_get_auth_url()
    return {"url": url}


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)) -> RedirectResponse:
    token = await google_handle_callback(code, db)
    redirect_url = f"{settings.frontend_url}/auth/callback?token={token}"
    return RedirectResponse(url=redirect_url)
