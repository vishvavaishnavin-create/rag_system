from fastapi import APIRouter, Depends, HTTPException

from database import User
from models.chat import AskRequest, AskResponse
from services import chat as chat_svc
from services.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(body: AskRequest, current_user: User = Depends(get_current_user)) -> AskResponse:
    try:
        answer_text = chat_svc.answer(
            body.question,
            [h.model_dump() for h in body.history],
            current_user.username,
            body.session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AskResponse(question=body.question, answer=answer_text)
