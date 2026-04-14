import { io } from 'socket.io-client';
import { refreshToken } from './authService';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class SocketClient {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        if (this.socket) return; // Already connected or connecting

        this.socket = io(SOCKET_URL, {
            path: '/socket.io',
            withCredentials: true, // Crucial for sending httpOnly cookies
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected directly via httpOnly cookie auth');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection Error:', error);
            if (error.data?.code === 'TOKEN_EXPIRED') {
                console.warn('[Socket] Token expired, attempting refresh...');
                refreshToken()
                    .then(() => {
                        // Fresh cookie is now set — force a reconnect
                        if (this.socket) {
                            this.socket.connect();
                        }
                    })
                    .catch(err => {
                        console.error('[Socket] Token refresh failed, user must re-login:', err);
                    });
            }
        });

        // Re-attach persistent listeners
        for (const [event, callbacks] of this.listeners.entries()) {
            callbacks.forEach(cb => this.socket.on(event, cb));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Full teardown — clears socket AND all persistent listeners.
     * Call this on logout to prevent stale listeners from a previous
     * user session re-attaching when a new user logs in.
     */
    reset() {
        this.disconnect();
        this.listeners.clear();
    }

    getSocket() {
        return this.socket;
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
        if (this.socket && callback) {
            this.socket.off(event, callback);
        } else if (this.socket) {
            this.socket.off(event);
        }
    }

    emit(event, payload, ackCallback) {
        if (!this.socket) {
            console.warn(`[Socket] Tried to emit ${event} but socket is disconnected.`);
            return;
        }

        if (ackCallback) {
            this.socket.emit(event, payload, ackCallback);
        } else {
            this.socket.emit(event, payload);
        }
    }
}

export const socketClient = new SocketClient();
