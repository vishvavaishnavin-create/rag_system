"""
Profile service — user stats, activity graphs, top topics, and password changes.
"""

import json
import os
from datetime import datetime, timedelta, timezone

from repository import auth as auth_repo
from utils import password as pwd_utils

HISTORY_DIR = os.path.expanduser("~/rag_system/history")

_TOPICS = [
    "AI", "Machine Learning", "Deep Learning", "NLP", "Neural Networks",
    "Transformers", "Attention", "BERT", "GPT",
]


def _iter_messages(username: str):
    user_dir = os.path.join(HISTORY_DIR, username)
    if not os.path.exists(user_dir):
        return
    for fname in os.listdir(user_dir):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(user_dir, fname), encoding="utf-8") as f:
                data = json.load(f)
            yield from data.get("messages", [])
        except (json.JSONDecodeError, KeyError):
            continue


def _iter_sessions(username: str):
    user_dir = os.path.join(HISTORY_DIR, username)
    if not os.path.exists(user_dir):
        return
    for fname in os.listdir(user_dir):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(user_dir, fname), encoding="utf-8") as f:
                yield json.load(f)
        except (json.JSONDecodeError, KeyError):
            continue


def get_user_stats(username: str, member_since: str) -> dict:
    from services import chat as chat_svc

    total_sessions = total_messages = total_questions = 0
    msg_by_date: dict[str, int] = {}

    for session in _iter_sessions(username):
        total_sessions += 1
        for msg in session.get("messages", []):
            total_messages += 1
            if msg.get("role") == "user":
                total_questions += 1
            ts = msg.get("timestamp", "")
            if ts:
                try:
                    date_str = datetime.fromisoformat(ts).strftime("%Y-%m-%d")
                    msg_by_date[date_str] = msg_by_date.get(date_str, 0) + 1
                except ValueError:
                    pass

    most_active_day = "N/A"
    if msg_by_date:
        best = max(msg_by_date, key=lambda d: msg_by_date[d])
        most_active_day = datetime.fromisoformat(best).strftime("%A")

    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "total_questions": total_questions,
        "pdfs_uploaded": len(chat_svc.get_pdf_filenames()),
        "avg_messages_per_session": round(total_messages / total_sessions, 1) if total_sessions else 0.0,
        "most_active_day": most_active_day,
        "member_since": member_since,
    }


def get_activity(username: str) -> list[dict]:
    msg_by_date: dict[str, dict[str, int]] = {}
    for msg in _iter_messages(username):
        ts = msg.get("timestamp", "")
        if not ts:
            continue
        try:
            date_str = datetime.fromisoformat(ts).strftime("%Y-%m-%d")
        except ValueError:
            continue
        if date_str not in msg_by_date:
            msg_by_date[date_str] = {"messages": 0, "questions": 0}
        msg_by_date[date_str]["messages"] += 1
        if msg.get("role") == "user":
            msg_by_date[date_str]["questions"] += 1

    now = datetime.now(timezone.utc)
    result = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        date_str = day.strftime("%Y-%m-%d")
        counts = msg_by_date.get(date_str, {"messages": 0, "questions": 0})
        result.append({"date": day.strftime("%a"), **counts})
    return result


def get_top_topics(username: str) -> list[dict]:
    counts: dict[str, int] = {t: 0 for t in _TOPICS}
    for msg in _iter_messages(username):
        if msg.get("role") != "user":
            continue
        content = msg.get("content", "").lower()
        for topic in _TOPICS:
            if topic.lower() in content:
                counts[topic] += 1
    sorted_topics = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [{"topic": t, "count": c} for t, c in sorted_topics[:5] if c > 0]


def change_password(db, username: str, old_password: str, new_password: str) -> None:
    user = auth_repo.find_by_username(db, username)
    if not user:
        raise ValueError("User not found.")
    if not pwd_utils.verify_password(old_password, user.hashed_password):
        raise ValueError("Current password is incorrect.")
    auth_repo.update_password(db, user.id, pwd_utils.hash_password(new_password))
