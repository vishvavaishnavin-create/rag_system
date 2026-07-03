const API_URL = import.meta.env.VITE_API_URL || `${API_URL}`
import type { AskRequest, AskResponse } from '../types/chat';

const BASE = `${API_URL}`;

export async function askQuestion(req: AskRequest, token: string): Promise<AskResponse> {
  const res = await fetch(`${BASE}/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Request failed.');
  }
  return res.json() as Promise<AskResponse>;
}
