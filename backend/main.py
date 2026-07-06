"""
FastAPI entry point — app setup only.
Business logic lives in services/; HTTP handling lives in routes/.
"""
import os
import sys

# sys.path must be configured before any local imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, create_tables
from routes import admin, auth, chat, documents, history, profile, topics
from services import chat as chat_svc
from services.auth import create_admin_if_not_exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    db = SessionLocal()
    try:
        create_admin_if_not_exists(db)
    finally:
        db.close()
    chat_svc.initialize()
    yield


app = FastAPI(title="WikiRAG API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(history.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(topics.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
