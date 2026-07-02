"""File-based topic repository — load and save per-user topic JSON files."""

import json
import os

_USER_TOPICS_DIR = os.path.expanduser("~/rag_system/user_topics")
os.makedirs(_USER_TOPICS_DIR, exist_ok=True)


def _path(username: str) -> str:
    return os.path.join(_USER_TOPICS_DIR, f"{username}.json")


def load_user_topics(username: str) -> list[dict]:
    path = _path(username)
    if not os.path.exists(path):
        return []
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_user_topics(username: str, topics: list[dict]) -> None:
    with open(_path(username), "w") as f:
        json.dump(topics, f, indent=2)
