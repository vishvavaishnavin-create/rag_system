const API_URL = import.meta.env.VITE_API_URL || `${API_URL}`
import type { DocumentsResponse, UploadResponse } from '../types/document';

const BASE = `${API_URL}`;

export async function uploadPDF(file: File, token: string): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    // Do NOT set Content-Type manually — the browser sets the correct multipart boundary
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Upload failed.');
  }
  return res.json() as Promise<UploadResponse>;
}

export async function getDocuments(token: string): Promise<DocumentsResponse> {
  const res = await fetch(`${BASE}/documents/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load documents.');
  return res.json() as Promise<DocumentsResponse>;
}
