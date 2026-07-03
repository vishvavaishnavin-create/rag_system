const API_URL = import.meta.env.VITE_API_URL || `${API_URL}`
import type { SessionDetail, SessionsResponse } from '../types/history';

const BASE = `${API_URL}`;

export async function getSessions(token: string): Promise<SessionsResponse> {
  const res = await fetch(`${BASE}/history/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load sessions.');
  return res.json() as Promise<SessionsResponse>;
}

export async function createSession(token: string): Promise<string> {
  const res = await fetch(`${BASE}/history/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to create session.');
  const data = await res.json() as { session_id: string };
  return data.session_id;
}

export async function getSession(sessionId: string, token: string): Promise<SessionDetail> {
  const res = await fetch(`${BASE}/history/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load session.');
  return res.json() as Promise<SessionDetail>;
}

export async function deleteSession(sessionId: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/history/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete session.');
}
