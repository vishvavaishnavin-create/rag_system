"""
Admin service — system-wide stats, user management, and PDF management.
"""

import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from models.admin import AdminActivityResponse, AdminPDF, AdminPDFsResponse, AdminStats, AdminUser, AdminUsersResponse, DailyActivity
from repository import auth as auth_repo
from services import chat as chat_svc
from services import history as history_svc

os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "history")


def _count_sessions_and_messages(username: str) -> tuple[int, int]:
    user_dir = os.path.join(_HISTORY_DIR, username)
    if not os.path.isdir(user_dir):
        return 0, 0
    sessions = messages = 0
    for fname in os.listdir(user_dir):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(user_dir, fname), encoding="utf-8") as f:
                data = json.load(f)
            sessions += 1
            messages += len(data.get("messages", []))
        except (json.JSONDecodeError, OSError):
            continue
    return sessions, messages


def _count_all_sessions_and_messages() -> tuple[int, int]:
    if not os.path.isdir(_HISTORY_DIR):
        return 0, 0
    total_sessions = total_messages = 0
    for entry in os.scandir(_HISTORY_DIR):
        if not entry.is_dir():
            continue
        s, m = _count_sessions_and_messages(entry.name)
        total_sessions += s
        total_messages += m
    return total_sessions, total_messages


def _get_activity_counts(days: int = 14) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    counts: dict[str, int] = {
        (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d"): 0
        for i in range(days)
    }
    if not os.path.isdir(_HISTORY_DIR):
        return counts
    for entry in os.scandir(_HISTORY_DIR):
        if not entry.is_dir():
            continue
        for fname in os.listdir(entry.path):
            if not fname.endswith(".json"):
                continue
            try:
                with open(os.path.join(entry.path, fname), encoding="utf-8") as f:
                    data = json.load(f)
                for msg in data.get("messages", []):
                    day = msg.get("timestamp", "")[:10]
                    if day in counts:
                        counts[day] += 1
            except (json.JSONDecodeError, OSError):
                continue
    return counts


def get_stats(db) -> AdminStats:
    total_sessions, total_messages = _count_all_sessions_and_messages()
    return AdminStats(
        total_users=auth_repo.count_all(db),
        active_users=auth_repo.count_active(db),
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_pdfs=chat_svc.count_pdf_files(),
    )


def get_users(db) -> AdminUsersResponse:
    users = auth_repo.find_all(db)
    result = []
    for u in users:
        sessions, messages = _count_sessions_and_messages(u.username)
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
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself.")
    user = auth_repo.find_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    history_svc.delete_user_data(user.username)
    chat_svc.delete_by_uploaded_by(user.username)
    auth_repo.delete_user(db, user_id)
    return {"status": "deleted"}


def toggle_user(db, user_id: int, current_admin_id: int) -> dict:
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself.")
    user = auth_repo.find_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    updated = auth_repo.update_active_status(db, user_id, not user.is_active)
    return {"status": "enabled" if updated.is_active else "disabled"}


def get_pdfs() -> AdminPDFsResponse:
    pdfs = [
        AdminPDF(filename=m["filename"], uploaded_by=m["uploaded_by"], chunk_count=m["chunk_count"])
        for m in chat_svc.get_pdf_metadata()
    ]
    return AdminPDFsResponse(pdfs=pdfs)


def delete_pdf(filename: str) -> dict:
    return {"status": "deleted", "chunks_removed": chat_svc.delete_by_filename(filename)}


def get_activity() -> AdminActivityResponse:
    counts = _get_activity_counts(days=14)
    activity = [DailyActivity(date=day, messages=cnt) for day, cnt in sorted(counts.items())]
    return AdminActivityResponse(activity=activity)
