from fastapi import APIRouter, Depends, HTTPException

from database import User
from models.history import Session, SessionDetail, SessionsResponse
from services import history as history_svc
from services.auth import get_current_user

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/sessions", response_model=SessionsResponse)
def list_sessions(current_user: User = Depends(get_current_user)) -> SessionsResponse:
    raw = history_svc.get_sessions(current_user.username)
    return SessionsResponse(sessions=[Session(**s) for s in raw])


@router.post("/sessions", status_code=201)
def create_session(current_user: User = Depends(get_current_user)) -> dict:
    session_id = history_svc.create_session(current_user.username)
    return {"session_id": session_id}


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: str, current_user: User = Depends(get_current_user)) -> SessionDetail:
    data = history_svc.get_session(current_user.username, session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return SessionDetail(
        session_id=data["session_id"],
        title=data["title"],
        messages=data["messages"],
    )


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, current_user: User = Depends(get_current_user)) -> None:
    deleted = history_svc.delete_session(current_user.username, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
