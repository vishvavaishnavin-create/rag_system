"""
Documents service — PDF text extraction, chunking, and ChromaDB indexing.
"""

import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app_config import settings
from services import chat as chat_svc


def process_upload(tmp_path: str, filename: str, username: str) -> int:
    """Extract text, chunk, and index a PDF. Returns number of chunks added (0 = no text)."""
    doc = fitz.open(tmp_path)
    pages = [page.get_text() for page in doc if page.get_text().strip()]
    doc.close()

    if not pages:
        return 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.create_documents(
        texts=["\n\n".join(pages)],
        metadatas=[{"source": "pdf", "filename": filename, "uploaded_by": username}],
    )
    chat_svc.add_documents(chunks)
    return len(chunks)
