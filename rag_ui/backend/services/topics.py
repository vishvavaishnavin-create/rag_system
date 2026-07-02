"""
Topics service — validate Wikipedia topics, index them, and persist per-user topic lists.
"""

import json
import os
from datetime import datetime, timezone

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app_config import settings
from services import chat as chat_svc
from utils import wikipedia as wiki_utils

DEFAULT_TOPICS = [
    "Artificial intelligence",
    "Machine learning",
    "Deep learning",
    "Natural language processing",
    "Neural network",
]

_USER_TOPICS_DIR = os.path.expanduser("~/rag_system/user_topics")
os.makedirs(_USER_TOPICS_DIR, exist_ok=True)


def _user_topics_path(username: str) -> str:
    return os.path.join(_USER_TOPICS_DIR, f"{username}.json")


def _load_user_topics(username: str) -> list[dict]:
    path = _user_topics_path(username)
    if not os.path.exists(path):
        return []
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_user_topics(username: str, topics: list[dict]) -> None:
    with open(_user_topics_path(username), "w") as f:
        json.dump(topics, f, indent=2)


def get_available_topics(username: str) -> dict:
    user_topics = _load_user_topics(username)
    return {
        "default_topics": DEFAULT_TOPICS,
        "user_topics": user_topics,
        "all_topics": DEFAULT_TOPICS + [t["name"] for t in user_topics],
    }


def add_topic(username: str, topic: str) -> dict:
    for default in DEFAULT_TOPICS:
        if default.lower() == topic.lower():
            raise ValueError(f"'{default}' is already in the default knowledge base.")

    existing = _load_user_topics(username)
    for t in existing:
        if t["name"].lower() == topic.lower() or t.get("wiki_title", "").lower() == topic.lower():
            raise ValueError(f"'{t['name']}' is already in your custom topics.")

    wiki_data = wiki_utils.fetch_article(topic)
    if wiki_data is None:
        raise RuntimeError(f"Could not find '{topic}' on Wikipedia.")

    wiki_title = wiki_data["title"]
    for default in DEFAULT_TOPICS:
        if default.lower() == wiki_title.lower():
            raise ValueError(f"'{wiki_title}' is already in the default knowledge base.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size, chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.create_documents(
        texts=[wiki_data["text"]],
        metadatas=[{"source": "wikipedia", "title": wiki_title, "user_topic": "true"}],
    )
    chat_svc.add_documents(chunks)

    entry = {
        "name": topic,
        "wiki_title": wiki_title,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "chunks_count": len(chunks),
    }
    existing.append(entry)
    _save_user_topics(username, existing)
    return {"chunks_added": len(chunks), "wiki_title": wiki_title}


def remove_topic(username: str, topic_name: str) -> dict:
    user_topics = _load_user_topics(username)
    match = next((t for t in user_topics if t["name"].lower() == topic_name.lower()), None)
    if match is None:
        raise ValueError(f"Topic '{topic_name}' not found in your custom topics.")

    removed = chat_svc.remove_documents_by_title(match.get("wiki_title", match["name"]))
    _save_user_topics(username, [t for t in user_topics if t["name"].lower() != topic_name.lower()])
    return {"removed_chunks": removed}
