from pydantic import BaseModel
from typing import List


class HistoryItem(BaseModel):
    """A single conversation turn sent from the frontend for context."""
    role: str
    content: str


class AskRequest(BaseModel):
    question: str
    history: List[HistoryItem] = []
    session_id: str


class AskResponse(BaseModel):
    question: str
    answer: str
