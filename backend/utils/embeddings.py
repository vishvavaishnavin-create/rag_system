from langchain_huggingface import HuggingFaceEmbeddings

from app_config import settings

_model: HuggingFaceEmbeddings | None = None


def get_embedding_model() -> HuggingFaceEmbeddings:
    """Return the singleton embedding model, loading it on first call."""
    global _model
    if _model is None:
        _model = HuggingFaceEmbeddings(model_name=settings.embedding_model)
    return _model
