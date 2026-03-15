import { BASE_URL } from './backend-server';

let cachedToken: string | null = null;

export async function getTestToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'testpass123' }),
  });

  if (response.status === 200) {
    const { token } = await response.json();
    cachedToken = token;
    return token;
  }

  // Auth not configured or user doesn't exist
  return null;
}

export function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
