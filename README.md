# WikiRAG

A full-stack RAG (Retrieval-Augmented Generation) application that lets you chat with Wikipedia articles and uploaded PDFs using Google Gemini and LangChain.

## Tech Stack

**Backend:** FastAPI · SQLAlchemy · LangChain · ChromaDB · HuggingFace Embeddings · Google Gemini  
**Frontend:** React 18 · TypeScript · Tailwind CSS · React Router · Recharts

## Features

- **Wikipedia RAG** — ask questions grounded in Wikipedia articles
- **PDF upload** — upload and index your own documents
- **Chat history** — persistent sessions per user
- **User management** — register, login, Google OAuth
- **Admin dashboard** — user stats, PDF management, activity charts
- **Topics** — add/remove Wikipedia topics to the knowledge base
- **Voice input** — Web Speech API integration

## Project Structure

```
rag_system/
├── config.py            ← RAG core settings
├── indexer.py           ← Wikipedia indexer
├── rag_pipeline.py      ← LangChain RAG pipeline
├── requirements.txt     ← Python dependencies
└── rag_ui/
    ├── backend/         ← FastAPI server
    │   ├── main.py
    │   ├── routes/      ← HTTP endpoints
    │   ├── services/    ← business logic
    │   ├── repository/  ← database queries
    │   ├── models/      ← Pydantic schemas
    │   └── utils/       ← pure utilities
    └── frontend/        ← React app
        └── src/
            ├── pages/
            ├── components/
            ├── services/  ← API calls
            ├── hooks/
            ├── context/
            └── types/
```

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd rag_system
cp .env.example .env
# Edit .env with your API keys
```

### 2. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd rag_ui/backend
python3 run.py
```

### 3. Frontend

```bash
cd rag_ui/frontend
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Google Gemini API key |
| `SECRET_KEY` | JWT signing secret (generate with `python3 -c "import secrets; print(secrets.token_hex(32))"`) |
| `ADMIN_USERNAME` | Admin account username |
| `ADMIN_PASSWORD` | Admin account password |
| `ADMIN_EMAIL` | Admin account email |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (optional) |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT |
| GET | `/auth/me` | Get current user |
| POST | `/chat/ask` | Ask a question |
| GET | `/history/sessions` | List chat sessions |
| POST | `/history/sessions` | Create new session |
| DELETE | `/history/sessions/{id}` | Delete session |
| POST | `/documents/upload` | Upload a PDF |
| GET | `/documents/list` | List uploaded PDFs |
| GET | `/topics/available` | Get available topics |
| POST | `/topics/add` | Add Wikipedia topic |
| DELETE | `/topics/{name}` | Remove topic |
| GET | `/profile/stats` | User statistics |
| GET | `/admin/stats` | Admin statistics |
| GET | `/admin/users` | List all users |
| GET | `/health` | Health check |
