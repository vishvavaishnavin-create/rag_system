import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    google_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    rag_system_path: str = os.path.expanduser("~/rag_system")
    chroma_db_dir: str = "./chroma_db"
    collection_name: str = "wikipedia_rag"
    embedding_model: str = "all-MiniLM-L6-v2"
    top_k: int = 5
    chunk_size: int = 500
    chunk_overlap: int = 50
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    history_file: str = os.path.expanduser("~/rag_system/chat_history.json")
    database_url: str = "sqlite:////Users/vishva/rag_system/users.db"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    admin_email: str = "admin@wikirag.com"
    google_client_id: str = ""
    google_client_secret: str = ""
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = os.path.expanduser("~/rag_system/.env")

settings = Settings()
