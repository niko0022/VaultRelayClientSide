import { createContext, useContext, useState, useEffect } from 'react';
import { login as authLogin, logout as authLogout, register as authRegister, getMe, deleteAccount } from '../services/authService';
import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { logEvent, clearEvents } from '../lib/eventLog';

const AuthContext = createContext();

async function hashEmail(email) {
    if (!email) return '';
    const msgBuffer = new TextEncoder().encode(String(email).trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lockedChats, setLockedChats] = useState([]);
    const [unlockedChats, setUnlockedChats] = useState([]);
    const [isFolderUnlocked, setIsFolderUnlocked] = useState(false);

    const refreshLockedChats = async () => {
        try {
            const ids = await signalStoreAdapter.getAllLockedChatIds();
            setLockedChats(ids);
        } catch (err) {
            console.error('Failed to load chat locks:', err);
        }
    };

    const checkAuth = async () => {
        setIsLoading(true);
        try {
            const data = await getMe();
            const userData = data.user || (data.id ? data : null);
            if (userData) {
                await signalStoreAdapter.init(userData.id);
                await refreshLockedChats();
            }
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
        let didAutoInit = false;
        try {
            // Hash the email and look up the cached user ID
            const hashedEmail = await hashEmail(credentials.email);
            const cachedUserId = hashedEmail ? localStorage.getItem(`vr_hash_${hashedEmail}`) : null;
            if (cachedUserId) {
                await signalStoreAdapter.init(cachedUserId);
                didAutoInit = true;
            }

            const result = await authLogin(credentials);

            // Init the per-user DB before writing any device meta into it
            const loginUser = result?.user || (result?.id ? result : null);
            if (loginUser) {
                await signalStoreAdapter.init(loginUser.id);
                await refreshLockedChats();
                // Save the hashed email mapping to localStorage
                if (hashedEmail) {
                    localStorage.setItem(`vr_hash_${hashedEmail}`, loginUser.id);
                }
            }

            // Save deviceId to IndexedDB if returned
            if (result && result.deviceId) {
                await signalStoreAdapter.setDeviceId(result.deviceId);
                await signalStoreAdapter.setIsPrimaryDevice(result.isPrimary || (result.deviceId === 1));
            }

            await checkAuth();
            logEvent('AUTH', 'User authenticated successfully');
        } catch (err) {
            // Revert initialization if the login fails
            if (didAutoInit) {
                signalStoreAdapter.reset();
            }
            throw err;
        }
    };

    /**
     * Controlled registration — registers the user, saves the primary device to IndexedDB,
     * then fetches the authenticated user profile.
     */
    const handleRegister = async (credentials) => {
        const result = await authRegister(credentials);

        // Init the per-user DB before writing any device meta into it
        const registerUser = result?.user || (result?.id ? result : null);
        if (registerUser) {
            await signalStoreAdapter.init(registerUser.id);
            const hashedEmail = await hashEmail(credentials.email);
            if (hashedEmail) {
                localStorage.setItem(`vr_hash_${hashedEmail}`, registerUser.id);
            }
        }

        // Save deviceId to IndexedDB if returned
        if (result && result.deviceId) {
            await signalStoreAdapter.setDeviceId(result.deviceId);
            await signalStoreAdapter.setIsPrimaryDevice(result.isPrimary || (result.deviceId === 1));
        }

        logEvent('AUTH', 'User registered successfully');
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
            signalStoreAdapter.reset(); // Clear per-user DB context without deleting the DB
            socketClient.reset();
            setUser(null);
            setLockedChats([]);
            setUnlockedChats([]);
            setIsFolderUnlocked(false);
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
            setLockedChats([]);
            setUnlockedChats([]);
            setIsFolderUnlocked(false);
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
        register: handleRegister,
        checkAuth,
        nukeAccount,
        lockedChats,
        setLockedChats,
        unlockedChats,
        setUnlockedChats,
        refreshLockedChats,
        isFolderUnlocked,
        setIsFolderUnlocked,
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
