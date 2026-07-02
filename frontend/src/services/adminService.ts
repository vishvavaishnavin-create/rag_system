import type {
  AdminActivityResponse,
  AdminPDFsResponse,
  AdminStats,
  AdminUsersResponse,
} from '../types/admin';

const BASE = 'http://localhost:8000';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getStats(token: string): Promise<AdminStats> {
  return request(`${BASE}/admin/stats`, { headers: authHeaders(token) });
}

export function getUsers(token: string): Promise<AdminUsersResponse> {
  return request(`${BASE}/admin/users`, { headers: authHeaders(token) });
}

export function deleteUser(id: number, token: string): Promise<{ status: string }> {
  return request(`${BASE}/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function toggleUser(id: number, token: string): Promise<{ status: string }> {
  return request(`${BASE}/admin/users/${id}/toggle`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export function getPDFs(token: string): Promise<AdminPDFsResponse> {
  return request(`${BASE}/admin/pdfs`, { headers: authHeaders(token) });
}

export function deletePDF(filename: string, token: string): Promise<{ status: string; chunks_removed: number }> {
  return request(`${BASE}/admin/pdfs/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function getActivity(token: string): Promise<AdminActivityResponse> {
  return request(`${BASE}/admin/activity`, { headers: authHeaders(token) });
}
