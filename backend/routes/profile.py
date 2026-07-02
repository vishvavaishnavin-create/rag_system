from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import User, get_db
from models.profile import (
    ActivityResponse,
    ChangePasswordRequest,
    DailyActivity,
    TopicsResponse,
    TopTopic,
    UserStats,
)
from services import profile as profile_svc
from services.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/stats", response_model=UserStats)
def get_stats(current_user: User = Depends(get_current_user)) -> UserStats:
    member_since = (
        current_user.created_at.strftime("%B %Y")
        if current_user.created_at
        else "Unknown"
    )
    data = profile_svc.get_user_stats(current_user.username, member_since)
    return UserStats(**data)


@router.get("/activity", response_model=ActivityResponse)
def get_activity(current_user: User = Depends(get_current_user)) -> ActivityResponse:
    raw = profile_svc.get_activity(current_user.username)
    return ActivityResponse(activity=[DailyActivity(**d) for d in raw])


@router.get("/topics", response_model=TopicsResponse)
def get_topics(current_user: User = Depends(get_current_user)) -> TopicsResponse:
    raw = profile_svc.get_top_topics(current_user.username)
    return TopicsResponse(topics=[TopTopic(**t) for t in raw])


@router.put("/password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        profile_svc.change_password(
            db, current_user.username, body.old_password, body.new_password
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
