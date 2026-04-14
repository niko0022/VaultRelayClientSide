import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';
import { useSignalSession } from './useSignalSession';
import { useGroupSignalSession } from './useGroupSignalSession';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

// Helper to deduce remote user in a 1-to-1 chat
function getDirectRemoteUserId(conversation, currentUserId) {
    if (!conversation || conversation.type !== 'DIRECT') return null;
    return conversation.participantAId === currentUserId 
        ? conversation.participantBId 
        : conversation.participantAId;
}

export function useMessages(conversation, currentUserId) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasOlder, setHasOlder] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());

    const isGroup = conversation?.type === 'GROUP';
    const conversationId = conversation?.id;
    const remoteDirectUserId = getDirectRemoteUserId(conversation, currentUserId);

    // -- 1-to-1 Session API --
    const {
        isReady: directReady, hasSession: directHasSession, establishSession: directEstablish,
        encryptMessage: directEncrypt, decryptMessage: directDecrypt
    } = useSignalSession(remoteDirectUserId, 1);

    // -- Group Session API --
    const {
        isReady: groupReady, establishGroupSessions, generateGroupDistributionMap, 
        processGroupDistribution, encryptGroupMessage, decryptGroupMessage
    } = useGroupSignalSession(currentUserId);

    const isReady = directReady && groupReady;

    // Track whether we've fired off our SenderKey distribution
    const distributedRef = useRef(false);

    // --- Session Setup ---
    useEffect(() => {
        if (!conversation || !isReady) return;

        const initSession = async () => {
            try {
                if (isGroup) {
                    const participantIds = (conversation.participants || [])
                        .map(p => p.userId)
                        .filter(id => id !== currentUserId);
                    
                    if (participantIds.length > 0) {
                        const response = await chatService.getPreKeyBundles(participantIds);
                        const bundles = response.bundles || response;
                        await establishGroupSessions(bundles);
                    }
                } else if (remoteDirectUserId && !directHasSession) {
                    const bundle = await chatService.getPreKeyBundle(remoteDirectUserId);
                    await directEstablish(bundle);
                }
            } catch (err) {
                console.error("Session Setup Error:", err);
                setError(err.message);
            }
        };

        // Let's run this once per conversation focus
        initSession();
    }, [conversation, isReady, currentUserId, remoteDirectUserId, directHasSession, isGroup, establishGroupSessions, directEstablish]);

    // --- Decryption Routing ---
    const processMessages = useCallback(async (rawMessages) => {
        if (!isReady) return rawMessages;

        const processed = [];
        for (const msg of rawMessages) {
            
            // Handle Key Distribution Messages
            if (msg.contentType === 'SIGNAL_KEY_DISTRIBUTION') {
                if (isGroup && msg.senderId !== currentUserId) {
                    try {
                        let parsedMap = msg.content;
                        if (typeof msg.content === 'string') parsedMap = JSON.parse(msg.content);

                        await processGroupDistribution(msg.senderId, conversationId, parsedMap);
                    } catch (err) {
                        console.error('Failed to unpack distribution key:', err);
                    }
                }
                // Key distribution is a system message — don't show it in the UI list
                continue; 
            }

            if (msg.contentType === 'SIGNAL_ENCRYPTED') {
                if (msg.senderId === currentUserId) {
                    // Hot-swapped via LocalCache interceptor in loadMessages
                    processed.push({ ...msg, content: 'Message Sent' });
                } else {
                    try {
                        let plaintext = 'Error decrypting message';
                        if (isGroup) {
                            plaintext = await decryptGroupMessage(msg.senderId, conversationId, msg.content);
                        } else if (directHasSession) {
                            plaintext = await directDecrypt(msg.content);
                        } else {
                            plaintext = 'Encrypted Message (Initializing...)';
                        }
                        processed.push({ ...msg, content: plaintext, isDecrypted: true });
                    } catch (err) {
                        console.error("Failed to decrypt message", msg.id, err);
                        processed.push({ ...msg, content: 'Error decrypting message', isDecrypted: false });
                    }
                }
            } else {
                processed.push(msg);
            }
        }
        return processed;
    }, [isReady, isGroup, conversationId, currentUserId, directHasSession, decryptGroupMessage, directDecrypt, processGroupDistribution]);

    const processMessagesRef = useRef(processMessages);
    useEffect(() => { processMessagesRef.current = processMessages; }, [processMessages]);

    // --- Loading History ---
    const loadMessages = useCallback(async (cursor = null) => {
        if (!conversationId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await chatService.getMessages(conversationId, { limit: 50, cursor });
            const processedMessages = await processMessages(data.messages);

            // Merge Local Sent Messages 
            const localMsgs = await signalStoreAdapter.getLocalMessages(conversationId);
            const localMap = new Map(localMsgs.map(m => [m.id, m]));

            const finalProcessed = processedMessages.map(m => {
                if (m.senderId === currentUserId && m.contentType === 'SIGNAL_ENCRYPTED') {
                    if (localMap.has(m.id)) return localMap.get(m.id);
                }
                return m;
            });

            if (cursor) {
                setMessages(prev => [...finalProcessed, ...prev]);
            } else {
                setMessages(finalProcessed);
            }
            setNextCursor(data.nextCursor);
            setHasOlder(data.hasNext);

            if (data.messages.length > 0) {
                const latestForeignMsg = data.messages.slice().reverse().find(m => m.senderId !== currentUserId);
                if (latestForeignMsg) await chatService.markRead(conversationId, latestForeignMsg.id);
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [conversationId, currentUserId, processMessages]);

    const loadOlder = useCallback(() => {
        if (hasOlder && nextCursor && !loading) loadMessages(nextCursor);
    }, [hasOlder, nextCursor, loading, loadMessages]);

    // --- Sending Messages ---
    const sendSecureMessage = useCallback(async (plaintext) => {
        if (!conversationId) return;
        try {
            let encryptedPayload;

            if (isGroup) {
                // If we haven't distributed our key for this group yet in this session, do it now.
                if (!distributedRef.current) {
                    const participantIds = (conversation.participants || []).map(p => p.userId);
                    const mapBlob = await generateGroupDistributionMap(conversationId, participantIds);
                    
                    socketClient.emit('send_message', {
                        conversationId,
                        content: JSON.stringify(mapBlob),
                        contentType: 'SIGNAL_KEY_DISTRIBUTION'
                    }, () => {});

                    distributedRef.current = true;
                }
                encryptedPayload = await encryptGroupMessage(conversationId, plaintext);
            } else {
                if (!directHasSession) throw new Error("1-to-1 session not established");
                encryptedPayload = await directEncrypt(plaintext);
            }

            // Optimistic UI
            const tempId = `temp-${crypto.randomUUID()}`;
            const optimisticMsg = {
                id: tempId, conversationId, senderId: currentUserId,
                content: plaintext, contentType: 'TEXT',
                createdAt: new Date().toISOString(), isPending: true
            };
            setMessages(prev => [...prev, optimisticMsg]);

            const payload = {
                conversationId,
                content: encryptedPayload,
                contentType: 'SIGNAL_ENCRYPTED'
            };

            socketClient.emit('send_message', payload, async (ack) => {
                if (ack && !ack.success) {
                    setError(ack.error);
                    setMessages(prev => prev.filter(m => m.id !== tempId));
                } else if (ack && ack.success) {
                    const finalizedMsg = { ...ack.message, content: plaintext };
                    setMessages(prev => prev.map(m => m.id === tempId ? finalizedMsg : m));
                    try {
                        await signalStoreAdapter.saveLocalMessage(finalizedMsg);
                    } catch (e) {
                        console.error('Failed to stash local message cache', e);
                    }
                }
            });

        } catch (err) {
            console.error("Encryption failed:", err);
            setError(err.message);
        }
    }, [
        conversationId, isGroup, conversation, currentUserId, directHasSession,
        directEncrypt, encryptGroupMessage, generateGroupDistributionMap
    ]);

    // Socket Setup
    const setTypingStatus = useCallback((isTyping) => {
        if (!conversationId) return;
        socketClient.emit('typing', { conversationId, typing: isTyping });
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId) { setMessages([]); return; }
        
        // Reset distributed mark on conversation change
        distributedRef.current = false;

        socketClient.emit('join_conversation', { conversationId }, () => {});

        const handleIncomingMessage = async ({ message }) => {
            if (message.conversationId !== conversationId) return;
            if (message.senderId === currentUserId) return; // Handled optimistically

            const [processed] = await processMessagesRef.current([message]);
            if (processed) {
                setMessages(prev => {
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, processed];
                });
                chatService.markRead(conversationId, message.id).catch(()=>{});
            }
        };

        const unsubs = [
            socketClient.on('message', handleIncomingMessage),
            socketClient.on('message:edited', async (editedMessage) => {
                if (editedMessage.conversationId === conversationId) {
                    const [processed] = await processMessagesRef.current([editedMessage]);
                    if (processed) {
                        setMessages(prev => prev.map(m => m.id === editedMessage.id ? processed : m));
                    }
                }
            }),
            socketClient.on('message:deleted', ({ id, conversationId: evtConvId }) => {
                if (evtConvId === conversationId) {
                    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true, content: 'Message deleted' } : m));
                }
            }),
            socketClient.on('typing', ({ userId, typing }) => {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    typing ? newSet.add(userId) : newSet.delete(userId);
                    return newSet;
                });
            })
        ];

        return () => {
            socketClient.emit('leave_conversation', { conversationId });
            unsubs.forEach(unsub => unsub());
            setTypingUsers(new Set());
        };
    }, [conversationId, currentUserId]);

    // Initial message load
    useEffect(() => {
        if (conversationId && isReady) loadMessages();
    }, [conversationId, isReady, loadMessages]);

    return {
        messages, loading, error, hasOlder, loadOlder,
        sendSecureMessage, setTypingStatus, typingUsers,
        isSessionReady: isReady // Expose combined ready state
    };
}
