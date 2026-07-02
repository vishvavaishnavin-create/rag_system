import os
import urllib.parse
import urllib.request
import json
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

load_dotenv(os.path.expanduser("~/rag_system/.env"))

from config import (
    COLLECTION_NAME, EMBEDDING_MODEL,
    CHUNK_SIZE, CHUNK_OVERLAP, WIKIPEDIA_TOPICS,
)

def fetch_wikipedia_full(topic):
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
                    for i in range(0, min(len(text), 15000), 3000):
                        chunk = text[i:i+3000]
                        if chunk.strip():
                            docs.append(Document(
                                page_content=chunk,
                                metadata={"source": "wikipedia", "title": title}
                            ))
            return docs
    except Exception as e:
        print(f"  Could not fetch '{topic}': {e}")
    return []


def get_chroma_client():
    import chromadb
    api_key  = os.getenv("CHROMA_API_KEY", "")
    tenant   = os.getenv("CHROMA_TENANT", "")
    database = os.getenv("CHROMA_DATABASE", "wikirag")

    if api_key and tenant:
        print("Using Chroma Cloud...")
        client = chromadb.HttpClient(
            ssl=True,
            host="api.trychroma.com",
            headers={"x-chroma-token": api_key},
            tenant=tenant,
            database=database
        )
        return client, None
    else:
        print("Using local ChromaDB...")
        return None, "./chroma_db"


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
        print("No documents loaded.")
        return None

    print("\n" + "=" * 50)
    print("Step 2: Chunking documents...")
    print("=" * 50)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    chunks = splitter.split_documents(all_docs)
    print(f"Total chunks created: {len(chunks)}")

    print("\n" + "=" * 50)
    print("Step 3: Loading embedding model...")
    print("=" * 50)
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    print("Embedding model loaded.")

    print("\n" + "=" * 50)
    print("Step 4: Saving to ChromaDB...")
    print("=" * 50)

    chroma_client, local_dir = get_chroma_client()

    if chroma_client:
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=COLLECTION_NAME,
            client=chroma_client
        )
        print(f"Saved {len(chunks)} chunks to Chroma Cloud!")
    else:
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=COLLECTION_NAME,
            persist_directory=local_dir
        )
        print(f"Saved {len(chunks)} chunks to local ChromaDB!")

    print("Indexing complete.")
    return vectorstore


if __name__ == "__main__":
    index_wikipedia_data()