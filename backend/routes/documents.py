import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from database import User
from models.documents import DocumentsResponse, UploadResponse
from services import chat as chat_svc
from services import documents as docs_svc
from services.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
) -> UploadResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        chunks_added = docs_svc.process_upload(tmp_path, file.filename, current_user.username)
    finally:
        os.unlink(tmp_path)

    if not chunks_added:
        raise HTTPException(status_code=422, detail="No extractable text found in this PDF.")

    return UploadResponse(filename=file.filename, chunks_added=chunks_added, status="success")


@router.get("/list", response_model=DocumentsResponse)
def list_documents(current_user: User = Depends(get_current_user)) -> DocumentsResponse:
    return DocumentsResponse(documents=chat_svc.get_pdf_filenames())
