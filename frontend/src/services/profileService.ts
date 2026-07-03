const API_URL = import.meta.env.VITE_API_URL || `${API_URL}`
import type { ActivityResponse, TopicsResponse, UserStats } from '../types/profile';

const BASE = `${API_URL}`;

export async function getStats(token: string): Promise<UserStats> {
  const res = await fetch(`${BASE}/profile/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load stats.');
  return res.json() as Promise<UserStats>;
}

export async function getActivity(token: string): Promise<ActivityResponse> {
  const res = await fetch(`${BASE}/profile/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load activity.');
  return res.json() as Promise<ActivityResponse>;
}

export async function getTopics(token: string): Promise<TopicsResponse> {
  const res = await fetch(`${BASE}/profile/topics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load topics.');
  return res.json() as Promise<TopicsResponse>;
}

export async function changePassword(
  token: string,
  old_password: string,
  new_password: string,
): Promise<void> {
  const res = await fetch(`${BASE}/profile/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ old_password, new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to change password.');
  }
}
