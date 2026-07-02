from pydantic import BaseModel
from typing import List


class UploadResponse(BaseModel):
    filename: str
    chunks_added: int
    status: str


class DocumentsResponse(BaseModel):
    documents: List[str]
