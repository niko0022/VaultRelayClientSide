import { refreshToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Global promise to prevent multiple concurrent refresh calls
let activeRefreshPromise = null;

class ChatService {
    // Shared fetch helper with credentials properly set for httpOnly cookies
    async _fetch(endpoint, options = {}, isRetry = false) {
        const url = `${API_URL}${endpoint}`;
        const config = {
            ...options,
            credentials: 'include', // Automatically send httpOnly cookies
            headers: {
                ...options.headers,
            },
        };

        if (config.body && typeof config.body !== 'string' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
            config.headers['Content-Type'] = 'application/json';
        }

        let response = await fetch(url, config);

        // --- Interceptor: Silent Token Refresh ---
        if (response.status === 401 && !isRetry) {
            if (!activeRefreshPromise) {
                // Kick off the refresh and clear the lock when done
                activeRefreshPromise = refreshToken().finally(() => {
                    activeRefreshPromise = null;
                });
            }

            try {
                // Wait for whatever refresh is currently running to finish
                await activeRefreshPromise;
                // Retry the original request exactly once
                response = await fetch(url, config);
            } catch (err) {
                // If the refresh itself failed, the token is truly dead. Let the normal error throw below.
                console.error('[ChatService] Background token refresh failed.', err);
            }
        }

        if (!response.ok) {
            let errorMessage = 'An error occurred';
            try {
                const data = await response.json();
                errorMessage = data.message || (data.errors && data.errors[0]?.msg) || response.statusText;
            } catch (err) {
                // If response.json() fails, it means the server returned a non-JSON error (like an HTML 502 Bad Gateway page).
                // We purposefully ignore this parse error and fallback to throwing the generic error below.
            }
            throw new Error(errorMessage);
        }

        // 204 No Content handling, just in case
        if (response.status === 204) return null;

        return await response.json();
    }

    // --- Conversations API ---

    async listConversations({ limit = 20, cursor = null } = {}) {
        const params = new URLSearchParams({ limit });
        if (cursor) params.append('cursor', cursor);
        return await this._fetch(`/conversations?${params.toString()}`);
    }

    async getConversation(id) {
        return await this._fetch(`/conversations/${id}`);
    }

    async getOrCreateDirectConversation(participantId) {
        return await this._fetch('/conversations', {
            method: 'POST',
            body: { participantId }
        });
    }

    async createGroupConversation({ title, participantIds, avatarUrl }) {
        return await this._fetch('/conversations/group', {
            method: 'POST',
            body: { title, participantIds, avatarUrl }
        });
    }

    async deleteConversation(id) {
        return await this._fetch(`/conversations/${id}`, {
            method: 'DELETE'
        });
    }

    // --- Messages API ---

    async getMessages(conversationId, { limit = 50, cursor = null } = {}) {
        const params = new URLSearchParams({ limit });
        if (cursor) params.append('cursor', cursor);
        return await this._fetch(`/conversations/${conversationId}/messages?${params.toString()}`);
    }

    async sendMessage(conversationId, payload) {
        // payload = { content, contentType, attachmentUrl, replyToId }
        return await this._fetch(`/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: payload
        });
    }

    async editMessage(conversationId, messageId, content) {
        return await this._fetch(`/conversations/${conversationId}/messages/${messageId}`, {
            method: 'PUT',
            body: { content }
        });
    }

    async deleteMessage(conversationId, messageId) {
        return await this._fetch(`/conversations/${conversationId}/messages/${messageId}`, {
            method: 'DELETE'
        });
    }

    async markRead(conversationId, lastReadMessageId) {
        return await this._fetch(`/conversations/${conversationId}/read`, {
            method: 'POST',
            body: { lastReadMessageId }
        });
    }

    // --- Keys API ---

    async getPreKeyBundles(userIds) {
        return await this._fetch('/keys/batch', {
            method: 'POST',
            body: { userIds }
        });
    }

    async getPreKeyBundle(userId) {
        return await this._fetch(`/keys/${userId}`);
    }

    async uploadKeys(payload) {
        return await this._fetch('/keys', {
            method: 'POST',
            body: payload
        });
    }

    async getPreKeyCount() {
        return await this._fetch('/keys/count');
    }

    // --- Friends API ---

    async listFriends() {
        return await this._fetch('/friends');
    }

    async listPendingRequests() {
        return await this._fetch('/friends/pending');
    }

    async listBlockedUsers() {
        return await this._fetch('/friends/blocked');
    }

    async sendFriendRequest(friendCode) {
        return await this._fetch('/friends', {
            method: 'POST',
            body: { friendCode }
        });
    }

    async cancelFriendRequest(friendshipId) {
        return await this._fetch(`/friends/${friendshipId}/cancel`, {
            method: 'POST'
        });
    }

    async acceptFriendRequest(friendshipId) {
        return await this._fetch(`/friends/${friendshipId}/accept`, {
            method: 'POST'
        });
    }

    async declineFriendRequest(friendshipId) {
        return await this._fetch(`/friends/${friendshipId}/reject`, {
            method: 'POST'
        });
    }

    async removeFriend(friendshipId) {
        return await this._fetch(`/friends/${friendshipId}`, {
            method: 'DELETE'
        });
    }

    async blockUser(userId) {
        return await this._fetch(`/friends/${userId}/block`, {
            method: 'POST'
        });
    }

    async unblockUser(userId) {
        return await this._fetch(`/friends/${userId}/unblock`, {
            method: 'POST'
        });
    }

}

export const chatService = new ChatService();
