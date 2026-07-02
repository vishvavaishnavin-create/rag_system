"""
History service — per-user chat sessions stored as JSON files.
Files live at ~/rag_system/history/{username}/{session_id}.json
"""

import json
import os
import shutil
import uuid
from datetime import datetime, timezone

HISTORY_DIR = os.path.expanduser("~/rag_system/history")


def _user_dir(username: str) -> str:
    path = os.path.join(HISTORY_DIR, username)
    os.makedirs(path, exist_ok=True)
    return path


def _session_path(username: str, session_id: str) -> str:
    return os.path.join(_user_dir(username), f"{session_id}.json")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_session(username: str) -> str:
    session_id = str(uuid.uuid4())
    now = _now()
    data = {
        "session_id": session_id,
        "title": "New Chat",
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    with open(_session_path(username, session_id), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return session_id


def get_sessions(username: str) -> list[dict]:
    user_dir = _user_dir(username)
    sessions = []
    for fname in os.listdir(user_dir):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(user_dir, fname)
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            sessions.append({
                "session_id": data["session_id"],
                "title": data["title"],
                "created_at": data["created_at"],
                "updated_at": data["updated_at"],
                "message_count": len(data["messages"]),
            })
        except (json.JSONDecodeError, KeyError):
            continue
    sessions.sort(key=lambda s: s["updated_at"], reverse=True)
    return sessions


def get_session(username: str, session_id: str) -> dict | None:
    path = _session_path(username, session_id)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_message(username: str, session_id: str, role: str, content: str) -> None:
    path = _session_path(username, session_id)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if role == "user" and not data["messages"]:
        data["title"] = content[:40].strip()
    data["messages"].append({
        "id": str(uuid.uuid4()),
        "role": role,
        "content": content,
        "timestamp": _now(),
    })
    data["updated_at"] = _now()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def delete_session(username: str, session_id: str) -> bool:
    path = _session_path(username, session_id)
    if not os.path.exists(path):
        return False
    os.remove(path)
    return True


def delete_user_data(username: str) -> None:
    user_dir = os.path.join(HISTORY_DIR, username)
    if os.path.isdir(user_dir):
        shutil.rmtree(user_dir, ignore_errors=True)
