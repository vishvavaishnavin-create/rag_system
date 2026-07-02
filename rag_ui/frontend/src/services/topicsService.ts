import type { AddTopicResponse, TopicsAvailableResponse } from '../types/topics';

const BASE = 'http://localhost:8000';

export async function getTopics(token: string): Promise<TopicsAvailableResponse> {
  const res = await fetch(`${BASE}/topics/available`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load topics.');
  return res.json() as Promise<TopicsAvailableResponse>;
}

export async function addTopic(topic: string, token: string): Promise<AddTopicResponse> {
  const res = await fetch(`${BASE}/topics/add`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to add topic.');
  }
  return res.json() as Promise<AddTopicResponse>;
}

export async function removeTopic(topicName: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/topics/${encodeURIComponent(topicName)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to remove topic.');
  }
}
