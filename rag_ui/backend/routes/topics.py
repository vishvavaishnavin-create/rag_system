"""
Topics routes — list, add, and remove Wikipedia knowledge topics.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import User
from services import topics as topics_svc
from services.auth import get_current_user

router = APIRouter(prefix="/topics", tags=["topics"])


class AddTopicRequest(BaseModel):
    topic: str


@router.get("/available")
def get_available_topics(current_user: User = Depends(get_current_user)) -> dict:
    return topics_svc.get_available_topics(current_user.username)


@router.post("/add")
def add_topic(body: AddTopicRequest, current_user: User = Depends(get_current_user)) -> dict:
    topic = body.topic.strip()
    if not topic:
        raise HTTPException(status_code=422, detail="Topic name cannot be empty.")
    try:
        result = topics_svc.add_topic(current_user.username, topic)
        return {"message": f"'{result['wiki_title']}' indexed successfully.", **result}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{topic_name}")
def remove_topic(topic_name: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        result = topics_svc.remove_topic(current_user.username, topic_name)
        return {"message": f"'{topic_name}' removed.", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
