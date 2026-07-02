from pydantic import BaseModel
from typing import List


class Message(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


class Session(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class SessionsResponse(BaseModel):
    sessions: List[Session]


class SessionDetail(BaseModel):
    session_id: str
    title: str
    messages: List[Message]


# Kept for backward compatibility
class HistoryResponse(BaseModel):
    history: List[Message]
