import type { LoginRequest, RegisterRequest, TokenResponse, User } from '../types/auth';

const BASE = 'http://localhost:8000';

export async function login(req: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Login failed.');
  }
  return res.json() as Promise<TokenResponse>;
}

export async function register(req: RegisterRequest): Promise<User> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Registration failed.');
  }
  return res.json() as Promise<User>;
}

export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Token invalid or expired.');
  return res.json() as Promise<User>;
}

export function logout(): void {
  localStorage.removeItem('token');
}

export async function markTourComplete(token: string): Promise<void> {
  await fetch(`${BASE}/auth/tour-complete`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}
