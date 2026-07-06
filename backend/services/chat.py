"""
Chat service — RAG chain, ChromaDB, and LLM.
Call initialize() once at startup; all other functions reuse the loaded state.
"""

import os

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

from app_config import settings
from utils.embeddings import get_embedding_model
from rag_pipeline import build_rag_chain

_rag_chain = None
_llm: ChatGoogleGenerativeAI | None = None

_HISTORY_PROMPT = """\
You are WikiRAG, a friendly AI assistant built with LangChain, ChromaDB and Google Gemini.
You were created by Vishva.
You specialise in Artificial Intelligence, Machine Learning, Deep Learning, NLP and Neural Networks.

For greetings like hi, hello, hey — respond warmly and introduce yourself briefly.
For identity questions like who are you, what can you do — describe yourself.
For all other questions — use only the context below to answer.
If the context does not contain enough information — say you can only answer about AI and ML topics.

{history_block}\
Context:
{context}

Current question: {question}
Answer:"""


def initialize() -> None:
    global _rag_chain, _llm
    print("Loading HuggingFace embedding model...")
    get_embedding_model()
    print("Embedding model ready.")
    print("Initialising Gemini LLM...")
    if settings.google_api_key:
        os.environ.setdefault("GOOGLE_API_KEY", settings.google_api_key)
    _llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        temperature=0,
        google_api_key=settings.google_api_key or None,
    )
    print("Building RAG chain (warm-up)...")
    _rag_chain = build_rag_chain()
    print("RAG service ready.")


def answer(question: str, history: list[dict], username: str, session_id: str) -> str:
    """Retrieve context, call LLM, save messages to session, return answer text."""
    from services import history as history_svc

    session = history_svc.get_session(username, session_id)
    if session is None:
        raise ValueError("Session not found.")
    if _llm is None:
        raise RuntimeError("Chat service not initialised — call initialize() first.")

    vectorstore = _get_vectorstore()
    docs = vectorstore.as_retriever(search_kwargs={"k": settings.top_k}).invoke(question)
    context = "\n\n".join(doc.page_content for doc in docs)

    history_block = ""
    if history:
        recent = history[-6:]
        lines = ["Previous conversation:"]
        for msg in recent:
            prefix = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{prefix}: {msg['content']}")
        history_block = "\n".join(lines) + "\n\n"

    prompt_text = _HISTORY_PROMPT.format(
        history_block=history_block, context=context, question=question,
    )
    response_text = StrOutputParser().invoke(_llm.invoke(prompt_text))

    history_svc.save_message(username, session_id, "user", question)
    history_svc.save_message(username, session_id, "assistant", response_text)
    return response_text


def add_documents(chunks: list[Document]) -> None:
    _get_vectorstore().add_documents(chunks)


def remove_documents_by_title(title: str) -> int:
    vectorstore = _get_vectorstore()
    result = vectorstore._collection.get(include=["metadatas"])
    ids_to_delete = [
        doc_id
        for doc_id, meta in zip(result.get("ids", []), result.get("metadatas", []))
        if meta.get("title") == title and meta.get("user_topic") == "true"
    ]
    if ids_to_delete:
        vectorstore._collection.delete(ids=ids_to_delete)
    return len(ids_to_delete)


def get_pdf_filenames() -> list[str]:
    result = _get_vectorstore()._collection.get(include=["metadatas"])
    seen: set[str] = set()
    filenames: list[str] = []
    for meta in result.get("metadatas", []):
        if meta.get("source") == "pdf":
            fname: str = meta.get("filename", "")
            if fname and fname not in seen:
                seen.add(fname)
                filenames.append(fname)
    return filenames


def get_pdf_metadata() -> list[dict]:
    """Return per-PDF metadata dicts for admin use."""
    result = _get_vectorstore()._collection.get(include=["metadatas"])
    counts: dict[str, dict] = {}
    for meta in result.get("metadatas", []):
        if meta.get("source") != "pdf":
            continue
        fname = meta.get("filename", "unknown")
        if fname not in counts:
            counts[fname] = {"chunk_count": 0, "uploaded_by": meta.get("uploaded_by", "unknown")}
        counts[fname]["chunk_count"] += 1
        if meta.get("uploaded_by"):
            counts[fname]["uploaded_by"] = meta["uploaded_by"]
    return [{"filename": f, **info} for f, info in counts.items()]


def count_pdf_files() -> int:
    result = _get_vectorstore()._collection.get(include=["metadatas"])
    return len({m.get("filename") for m in result.get("metadatas", []) if m.get("source") == "pdf" and m.get("filename")})


def delete_by_filename(filename: str) -> int:
    collection = _get_vectorstore()._collection
    existing = collection.get(where={"filename": filename}, include=["metadatas"])
    count = len(existing["ids"])
    if count:
        collection.delete(where={"filename": filename})
    return count


def delete_by_uploaded_by(username: str) -> None:
    try:
        _get_vectorstore()._collection.delete(where={"uploaded_by": username})
    except Exception:
        pass


def _get_vectorstore() -> Chroma:
    import chromadb
    client = chromadb.HttpClient(
        ssl=True,
        host=settings.chroma_host,
        headers={"x-chroma-token": settings.chroma_api_key.strip()},
        tenant=settings.chroma_tenant.strip(),
        database=settings.chroma_database.strip(),
    )
    return Chroma(
        collection_name=settings.collection_name,
        embedding_function=get_embedding_model(),
        client=client,
    )
