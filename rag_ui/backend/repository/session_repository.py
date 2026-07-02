"""File-based session repository — counts sessions and messages from JSON files."""

import json
import os
from datetime import datetime, timedelta, timezone

HISTORY_DIR = os.path.expanduser("~/rag_system/history")


def count_sessions_and_messages(username: str) -> tuple[int, int]:
    user_dir = os.path.join(HISTORY_DIR, username)
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


def count_all_sessions_and_messages() -> tuple[int, int]:
    if not os.path.isdir(HISTORY_DIR):
        return 0, 0
    total_sessions = total_messages = 0
    for entry in os.scandir(HISTORY_DIR):
        if not entry.is_dir():
            continue
        s, m = count_sessions_and_messages(entry.name)
        total_sessions += s
        total_messages += m
    return total_sessions, total_messages


def get_activity_counts(days: int = 14) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    counts: dict[str, int] = {
        (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d"): 0
        for i in range(days)
    }
    if not os.path.isdir(HISTORY_DIR):
        return counts
    for entry in os.scandir(HISTORY_DIR):
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
