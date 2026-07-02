from pydantic import BaseModel
from typing import List


class AddTopicRequest(BaseModel):
    topic: str


class TopicEntry(BaseModel):
    name: str
    wiki_title: str
    added_at: str
    chunks_count: int


class AvailableTopicsResponse(BaseModel):
    default_topics: List[str]
    user_topics: List[TopicEntry]
    all_topics: List[str]
