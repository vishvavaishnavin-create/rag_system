"""
PostgreSQL database setup using SQLAlchemy.
Connects to Aiven PostgreSQL Cloud.
"""
import sys
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/rag_system/.env"))

from sqlalchemy import (
    Boolean, Column, DateTime, Integer,
    String, create_engine, inspect, text
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# ── PostgreSQL Connection (Aiven Cloud) ────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLAlchemy needs postgresql:// not postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"sslmode": "require"}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    username         = Column(String, unique=True, index=True, nullable=False)
    email            = Column(String, unique=True, index=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)
    is_active        = Column(Boolean, default=True, nullable=False)
    is_admin         = Column(Boolean, default=False, nullable=False)
    has_seen_tour    = Column(Boolean, default=False, nullable=False)
    google_id        = Column(String, nullable=True)
    avatar_url       = Column(String, nullable=True)
    auth_provider    = Column(String, default="local", nullable=False)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    print("PostgreSQL tables created ✅")