import { useAuth } from '../contexts/AuthContext';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

const FOLDER_CONFIG_KEY = '_folder_passcode_config';

async function hashPasscode(passcode) {
    if (!passcode) return '';
    const encoder = new TextEncoder();
    const data = encoder.encode(String(passcode).trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useChatLock() {
    const { 
        lockedChats, 
        unlockedChats, 
        setUnlockedChats, 
        refreshLockedChats,
        isFolderUnlocked,
        setIsFolderUnlocked
    } = useAuth();

    /**
     * Checks if a passcode has been set up for the Locked Chats folder.
     */
    const hasFolderPasscode = async () => {
        const config = await signalStoreAdapter.getChatLock(FOLDER_CONFIG_KEY);
        return !!(config && config.passcodeHash);
    };

    /**
     * Sets a new passcode for the Locked Chats folder.
     */
    const setFolderPasscode = async (passcode) => {
        if (!passcode) return false;
        const passcodeHash = await hashPasscode(passcode);
        await signalStoreAdapter.setChatLock(FOLDER_CONFIG_KEY, { passcodeHash, createdAt: new Date().toISOString() });
        setIsFolderUnlocked(true); // Automatically unlock upon creation
        return true;
    };

    /**
     * Verifies the folder passcode. If correct, unlocks the folder in-memory.
     */
    const verifyFolderPasscode = async (passcode) => {
        if (!passcode) return false;
        const config = await signalStoreAdapter.getChatLock(FOLDER_CONFIG_KEY);
        if (!config || !config.passcodeHash) return false;

        const inputHash = await hashPasscode(passcode);
        if (inputHash === config.passcodeHash) {
            setIsFolderUnlocked(true);
            return true;
        }
        return false;
    };

    /**
     * Re-locks the folder and clears any temporarily unlocked chats.
     */
    const lockFolder = () => {
        setIsFolderUnlocked(false);
        setUnlockedChats([]);
    };

    /**
     * Checks if a conversation is locked.
     * Skips FOLDER_CONFIG_KEY internal row.
     */
    const isLocked = (conversationId) => {
        if (!conversationId || conversationId === FOLDER_CONFIG_KEY) return false;
        return lockedChats.includes(conversationId);
    };

    /**
     * Checks if a conversation is currently unlocked.
     * True if the whole folder is unlocked or if this specific chat was temporarily unlocked.
     */
    const isUnlocked = (conversationId) => {
        if (!conversationId) return false;
        return isFolderUnlocked || unlockedChats.includes(conversationId);
    };

    /**
     * Locks a conversation. Adds it to the database's locked chats list.
     */
    const lockChat = async (conversationId) => {
        if (!conversationId || conversationId === FOLDER_CONFIG_KEY) return false;
        await signalStoreAdapter.setChatLock(conversationId, { locked: true, lockedAt: new Date().toISOString() });
        await refreshLockedChats();
        return true;
    };

    /**
     * Unlocks a conversation permanently by deleting its locked entry.
     */
    const unlockChat = async (conversationId) => {
        if (!conversationId || conversationId === FOLDER_CONFIG_KEY) return false;
        await signalStoreAdapter.deleteChatLock(conversationId);
        await refreshLockedChats();
        setUnlockedChats(prev => prev.filter(id => id !== conversationId));
        return true;
    };

    /**
     * Temporarily unlocks a single conversation in-memory (useful for direct deep links).
     */
    const temporarilyUnlockChat = async (conversationId, passcode) => {
        if (!conversationId || !passcode) return false;
        const config = await signalStoreAdapter.getChatLock(FOLDER_CONFIG_KEY);
        if (!config || !config.passcodeHash) return false;

        const inputHash = await hashPasscode(passcode);
        if (inputHash === config.passcodeHash) {
            setUnlockedChats(prev => [...new Set([...prev, conversationId])]);
            return true;
        }
        return false;
    };

    return {
        hasFolderPasscode,
        setFolderPasscode,
        verifyFolderPasscode,
        lockFolder,
        isLocked,
        isUnlocked,
        lockChat,
        unlockChat,
        temporarilyUnlockChat,
        isFolderUnlocked
    };
}
