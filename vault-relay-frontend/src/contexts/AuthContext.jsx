import { createContext, useContext, useState, useEffect } from 'react';
import { login as authLogin, logout as authLogout, getMe, deleteAccount } from '../services/authService';
import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { logEvent, clearEvents } from '../lib/eventLog';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async () => {
        setIsLoading(true);
        try {
            const data = await getMe();
            const userData = data.user || (data.id ? data : null);
            setUser(userData);
        } catch (error) {
            console.error('Failed to authenticate:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    /**
     * Controlled login — calls the auth API, sets the httpOnly cookie,
     * then fetches the authenticated user profile.
     */
    const handleLogin = async (credentials) => {
        await authLogin(credentials);
        await checkAuth();
        logEvent('AUTH', 'User authenticated successfully');
    };

    /**
     * Controlled logout — calls the auth API, tears down the socket
     * (including stale listeners), and clears the user state.
     */
    const handleLogout = async () => {
        try {
            await authLogout();
        } catch (err) {
            console.error('Logout API call failed:', err);
        } finally {
            socketClient.reset();
            setUser(null);
            clearEvents();
        }
    };

    const nukeAccount = async () => {
        try {
            await deleteAccount();
            await signalStoreAdapter.deleteAllLocalData();
            localStorage.clear();
            socketClient.reset();
            setUser(null);
            clearEvents();
        } catch (err) {
            console.error('Failed to nuke account:', err);
        }
    };

    const value = {
        user,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        checkAuth,
        nukeAccount,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
