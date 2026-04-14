const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const message =
      data.message ||
      (Array.isArray(data.errors) ? data.errors.map((e) => e.msg).join(', ') : 'Something went wrong');
    throw new Error(message);
  }

  return data;
}

export async function register({ email, password, displayName, username }) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, username }),
  });
}

export async function login({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshToken() {
  return request('/auth/refresh', { method: 'POST' });
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return request('/users/me', { method: 'GET' });
}
