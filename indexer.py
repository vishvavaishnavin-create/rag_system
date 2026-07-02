import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import urllib.request
import json
from config import (
    CHROMA_DB_DIR, COLLECTION_NAME, EMBEDDING_MODEL,
    CHUNK_SIZE, CHUNK_OVERLAP, WIKIPEDIA_TOPICS,
)

def fetch_wikipedia_article(topic):
    """Fetch Wikipedia article using Wikipedia REST API directly — no library needed."""
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(topic)}"
        req = urllib.request.Request(url, headers={"User-Agent": "RAGSystem/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            title = data.get("title", topic)
            extract = data.get("extract", "")
            if extract:
                return Document(
                    page_content=extract,
                    metadata={"source": "wikipedia", "title": title}
                )
    except Exception as e:
        print(f"  ⚠️  Could not fetch '{topic}': {e}")
    return None

import urllib.parse

def fetch_wikipedia_full(topic):
    """Fetch full Wikipedia article text using the Wikipedia API."""
    try:
        query = urllib.parse.quote(topic)
        url = (
            f"https://en.wikipedia.org/w/api.php"
            f"?action=query&titles={query}&prop=extracts"
            f"&explaintext=true&format=json&exsectionformat=plain"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "RAGSystem/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            pages = data["query"]["pages"]
            docs = []
            for page_id, page in pages.items():
                if page_id == "-1":
                    continue
                text = page.get("extract", "")
                title = page.get("title", topic)
                if text:
                    # split into ~3000 char sections to get multiple docs per article
                    for i in range(0, min(len(text), 15000), 3000):
                        chunk = text[i:i+3000]
                        if chunk.strip():
                            docs.append(Document(
                                page_content=chunk,
                                metadata={"source": "wikipedia", "title": title}
                            ))
            return docs
    except Exception as e:
        print(f"  ⚠️  Could not fetch '{topic}': {e}")
    return []

def index_wikipedia_data():
    print("=" * 50)
    print("Step 1: Loading Wikipedia articles...")
    print("=" * 50)
    all_docs = []
    for topic in WIKIPEDIA_TOPICS:
        print(f"  Fetching: '{topic}'")
        docs = fetch_wikipedia_full(topic)
        all_docs.extend(docs)
        print(f"  -> Got {len(docs)} section(s)")
    print(f"\nTotal documents loaded: {len(all_docs)}")

    if not all_docs:
        print("❌ No documents loaded. Check your internet connection.")
        return None

    print("\n" + "=" * 50)
    print("Step 2: Chunking documents...")
    print("=" * 50)
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    chunks = splitter.split_documents(all_docs)
    print(f"Total chunks created: {len(chunks)}")

    print("\n" + "=" * 50)
    print("Step 3: Loading embedding model...")
    print("=" * 50)
    print(f"Model: {EMBEDDING_MODEL}")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    print("Embedding model loaded.")

    print("\n" + "=" * 50)
    print("Step 4: Embedding chunks and saving to ChromaDB...")
    print("=" * 50)
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_DB_DIR,
    )
    print(f"Saved {len(chunks)} chunks to ChromaDB at '{CHROMA_DB_DIR}'.")
    print("Indexing complete.\n")
    return vectorstore

if __name__ == "__main__":
    index_wikipedia_data()