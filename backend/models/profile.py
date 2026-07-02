from pydantic import BaseModel
from typing import List


class UserStats(BaseModel):
    total_sessions: int
    total_messages: int
    total_questions: int
    pdfs_uploaded: int
    avg_messages_per_session: float
    most_active_day: str
    member_since: str


class DailyActivity(BaseModel):
    date: str
    messages: int
    questions: int


class ActivityResponse(BaseModel):
    activity: List[DailyActivity]


class TopTopic(BaseModel):
    topic: str
    count: int


class TopicsResponse(BaseModel):
    topics: List[TopTopic]


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
