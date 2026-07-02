"""
Admin service — system-wide stats, user management, and PDF management.
"""

from models.admin import AdminActivityResponse, AdminPDF, AdminPDFsResponse, AdminStats, AdminUser, AdminUsersResponse, DailyActivity
from repository import session_repository, user_repository
from services import chat as chat_svc
from services import history as history_svc


def get_stats(db) -> AdminStats:
    total_sessions, total_messages = session_repository.count_all_sessions_and_messages()
    return AdminStats(
        total_users=user_repository.count_all(db),
        active_users=user_repository.count_active(db),
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_pdfs=chat_svc.count_pdf_files(),
    )


def get_users(db) -> AdminUsersResponse:
    users = user_repository.find_all(db)
    result = []
    for u in users:
        sessions, messages = session_repository.count_sessions_and_messages(u.username)
        result.append(AdminUser(
            id=u.id,
            username=u.username,
            email=u.email,
            is_active=bool(u.is_active),
            is_admin=bool(u.is_admin),
            created_at=u.created_at.isoformat() if u.created_at else "",
            session_count=sessions,
            message_count=messages,
        ))
    return AdminUsersResponse(users=result)


def delete_user(db, user_id: int, current_admin_id: int) -> dict:
    from fastapi import HTTPException
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself.")
    user = user_repository.find_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    history_svc.delete_user_data(user.username)
    chat_svc.delete_by_uploaded_by(user.username)
    user_repository.delete_user(db, user_id)
    return {"status": "deleted"}


def toggle_user(db, user_id: int, current_admin_id: int) -> dict:
    from fastapi import HTTPException
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself.")
    user = user_repository.find_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    updated = user_repository.update_active_status(db, user_id, not user.is_active)
    return {"status": "enabled" if updated.is_active else "disabled"}


def get_pdfs() -> AdminPDFsResponse:
    pdfs = [
        AdminPDF(filename=m["filename"], uploaded_by=m["uploaded_by"], chunk_count=m["chunk_count"])
        for m in chat_svc.get_pdf_metadata()
    ]
    return AdminPDFsResponse(pdfs=pdfs)


def delete_pdf(filename: str) -> dict:
    chunks_removed = chat_svc.delete_by_filename(filename)
    return {"status": "deleted", "chunks_removed": chunks_removed}


def get_activity() -> AdminActivityResponse:
    counts = session_repository.get_activity_counts(days=14)
    activity = [DailyActivity(date=day, messages=cnt) for day, cnt in sorted(counts.items())]
    return AdminActivityResponse(activity=activity)
