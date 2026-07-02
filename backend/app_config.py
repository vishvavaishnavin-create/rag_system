import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Gemini
    google_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"

    # RAG
    rag_system_path: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    chroma_db_dir: str = "./chroma_db"
    collection_name: str = "wikipedia_rag"
    embedding_model: str = "all-MiniLM-L6-v2"
    top_k: int = 5
    chunk_size: int = 500
    chunk_overlap: int = 50

    # JWT
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Database
    database_url: str = ""

    # Admin
    admin_username: str = "admin"
    admin_password: str = ""
    admin_email: str = ""

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    frontend_url: str = "http://localhost:5173"

    # Chroma Cloud
    chroma_host: str = "api.trychroma.com"
    chroma_api_key: str = ""
    chroma_tenant: str = ""
    chroma_database: str = "wikirag"
    use_chroma_cloud: bool = False

    class Config:
        env_file = os.path.expanduser("~/rag_system/.env")

settings = Settings()