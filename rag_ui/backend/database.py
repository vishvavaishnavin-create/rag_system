"""
SQLite database setup using SQLAlchemy.
Defines the User ORM model and the get_db() dependency for FastAPI.
"""
import sys
import os
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = f"sqlite:///{os.path.expanduser('~/rag_system/users.db')}"

# connect_args is SQLite-specific: allows use from multiple threads (FastAPI workers)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    """Stored in the `users` table in users.db."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    has_seen_tour = Column(Boolean, default=False, nullable=False)
    google_id = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    auth_provider = Column(String, default="local", nullable=False)


def get_db():
    """
    FastAPI dependency that yields a DB session and closes it afterwards.
    Usage in a route: db: Session = Depends(get_db)
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _run_migrations() -> None:
    """Add new columns to existing tables without dropping data."""
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("users")}
    with engine.connect() as conn:
        if "is_active" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
        if "is_admin" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0 NOT NULL"))
        if "has_seen_tour" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN has_seen_tour BOOLEAN DEFAULT 0 NOT NULL"))
        if "google_id" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN google_id TEXT"))
        if "avatar_url" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))
        if "auth_provider" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local' NOT NULL"))
        conn.commit()


def create_tables() -> None:
    """Create all tables that don't exist yet. Called once at server startup."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()
