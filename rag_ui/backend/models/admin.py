from pydantic import BaseModel


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_sessions: int
    total_messages: int
    total_pdfs: int


class AdminUser(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: str
    session_count: int
    message_count: int


class AdminUsersResponse(BaseModel):
    users: list[AdminUser]


class AdminPDF(BaseModel):
    filename: str
    uploaded_by: str
    chunk_count: int


class AdminPDFsResponse(BaseModel):
    pdfs: list[AdminPDF]


class DailyActivity(BaseModel):
    date: str
    messages: int


class AdminActivityResponse(BaseModel):
    activity: list[DailyActivity]
