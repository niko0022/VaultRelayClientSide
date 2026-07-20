import { logEvent } from '../lib/eventLog';

const API_BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
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
        },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Refresh succeeded! Retry the original request exactly once
        logEvent('AUTH', 'Session token silently refreshed');
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
  let deviceName = 'Web Client';
  try {
    const { detectDeviceName } = await import('../lib/signal/initWasm');
    deviceName = detectDeviceName();
  } catch (e) {
    console.warn("Failed to detect device name during registration:", e);
  }

  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, username, deviceName }),
  });
}

export async function login({ email, password }) {
  let deviceId = null;
  let deviceName = 'Web Client';
  try {
    const { signalStoreAdapter } = await import('../lib/signal/SignalStoreAdapter');
    deviceId = await signalStoreAdapter.getDeviceId();
    const { detectDeviceName } = await import('../lib/signal/initWasm');
    deviceName = detectDeviceName();
  } catch (e) {
    console.warn("Failed to get device ID or name from storage during login:", e);
  }

  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, deviceId, deviceName }),
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

export async function updateProfile(payload) {
  return request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getAvatarUploadUrl(payload) {
  return request('/users/me/avatar/upload-url', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeAvatarUpload(payload) {
  return request('/users/me/avatar/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAvatar() {
  return request('/users/me/avatar', { method: 'DELETE' });
}

export async function deleteAccount() {
  return request('/users/me', { method: 'DELETE' });
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function validateResetToken(token) {
  return request(`/auth/reset-password/${encodeURIComponent(token)}`);
}

export async function resetPassword({ token, newPassword }) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function requestEmailChange({ newEmail, currentPassword }) {
  return request('/users/me/email/request-change', {
    method: 'POST',
    body: JSON.stringify({ newEmail, currentPassword }),
  });
}

export async function confirmEmailChange(token) {
  return request('/users/me/email/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification(email) {
  return request('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyAccount(token) {
  return request('/auth/verify-account', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}