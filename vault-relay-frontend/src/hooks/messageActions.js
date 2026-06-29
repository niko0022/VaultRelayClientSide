import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Encrypts and sends an edit for an existing message.
 *
 * @param {string} messageId - The ID of the message to edit.
 * @param {string} newPlaintext - The new message text.
 * @param {object} deps - All required dependencies.
 */
export async function editSecureMessage(messageId, newPlaintext, {
    conversationId, messages, currentUserId, isGroup,
    directHasSession, directEncrypt, encryptGroupMessage,
    decryptedCacheRef, setMessages, setError,
    selfHasSession, selfEncrypt
}) {
    if (!conversationId) return;

    // Find the original message to check the 48h window
    const original = messages.find(m => m.id === messageId);
    if (!original) throw new Error('Message not found in current view');
    if (original.senderId !== currentUserId) throw new Error('You can only edit your own messages');

    if (Date.now() - new Date(original.createdAt).getTime() > EDIT_WINDOW_MS) {
        throw new Error('Edit window expired: messages can only be edited within 48 hours');
    }

    try {
        // Re-encrypt the new plaintext
        let encryptedPayload;
        if (isGroup) {
            encryptedPayload = await encryptGroupMessage(conversationId, newPlaintext);
        } else {
            if (!directHasSession) throw new Error('1-to-1 session not established');
            const recipientDeviceMap = await directEncrypt(newPlaintext);

            let selfDeviceMap = {};
            if (selfHasSession && selfEncrypt) {
                try {
                    selfDeviceMap = await selfEncrypt(newPlaintext);
                } catch (e) {
                    console.warn('Failed to encrypt edit for self-sync:', e);
                }
            }
            encryptedPayload = { ...recipientDeviceMap, ...selfDeviceMap };
        }

        // Send via socket
        socketClient.emit('client:edit_message', {
            messageId,
            content: encryptedPayload
        });

        // Optimistic: update UI and caches immediately (we know the plaintext)
        const editedMsg = { ...original, content: newPlaintext, editedAt: new Date().toISOString(), contentType: 'TEXT' };
        setMessages(prev => prev.map(m => m.id === messageId ? editedMsg : m));
        decryptedCacheRef.current.set(messageId, newPlaintext);

        // Update local IndexedDB copy
        signalStoreAdapter.saveLocalMessage(editedMsg).catch(e => {
            console.error('Failed to update local message cache after edit', e);
        });
    } catch (err) {
        console.error('Edit failed:', err);
        setError(err.message);
    }
}

/**
 * Deletes a message (optimistic UI + socket emit + IndexedDB cleanup).
 *
 * @param {string} messageId - The ID of the message to delete.
 * @param {object} deps - All required dependencies.
 */
export async function deleteSecureMessage(messageId, {
    conversationId, messages, currentUserId,
    decryptedCacheRef, setMessages, setError,
}) {
    if (!conversationId) return;

    const original = messages.find(m => m.id === messageId);
    if (!original) throw new Error('Message not found in current view');
    if (original.senderId !== currentUserId) throw new Error('You can only delete your own messages');

    try {
        // Send via socket
        socketClient.emit('client:delete_message', { messageId });

        // Optimistic: update UI immediately
        setMessages(prev => prev.map(m => m.id === messageId
            ? { ...m, deleted: true, content: 'Message deleted' }
            : m
        ));
        decryptedCacheRef.current.delete(messageId);

        // Remove from local IndexedDB
        signalStoreAdapter.deleteLocalMessage(messageId).catch(e => {
            console.error('Failed to remove local message cache after delete', e);
        });
    } catch (err) {
        console.error('Delete failed:', err);
        setError(err.message);
    }
}
