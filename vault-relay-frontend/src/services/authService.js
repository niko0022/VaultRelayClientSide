const API_BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    credentials: 'include',
    ...options,
  };
  let res = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // --- Interceptor: Silent Token Refresh ---
  // If we get a 401, and we aren't ALREADY trying to refresh the token, let's try to refresh it
  if (res.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
    try {
      // Call the refresh endpoint
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        credentials: 'include',
      });
      
      if (refreshRes.ok) {
        // Refresh succeeded! Retry the original request exactly once
        res = await fetch(`${API_BASE_URL}${endpoint}`, config);
      }
    } catch (err) {
      console.warn('[AuthService] Automatic refresh failed', err);
    }
  }

  if (res.status === 204) return null;

  // Some error responses (e.g. Passport.js 401) return plain text, not JSON
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Response is plain text like "Unauthorized"
    if (!res.ok) throw new Error(text || `Request failed with status ${res.status}`);
    return text;
  }

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
