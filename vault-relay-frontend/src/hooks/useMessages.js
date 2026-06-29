import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';
import { useSignalSession } from './useSignalSession';
import { useGroupSignalSession } from './useGroupSignalSession';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { processMessages as processMessagesCore } from './messageProcessing';
import { sendSecureMessage as sendSecureMessageCore } from './messageSending';
import { sendReaction } from './reactionSending';
import { editSecureMessage as editSecureMessageCore, deleteSecureMessage as deleteSecureMessageCore } from './messageActions';
import { useToast } from '../contexts/ToastContext';

// Helper to deduce remote user in a 1-to-1 chat
function getDirectRemoteUserId(conversation, currentUserId) {
    if (!conversation || conversation.type !== 'DIRECT') return null;
    return conversation.participantAId === currentUserId
        ? conversation.participantBId
        : conversation.participantAId;
}

export function useMessages(conversation, currentUserId) {
    const { showToast } = useToast();
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState({});
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
    } = useSignalSession(remoteDirectUserId);

    // -- Self-Sync Session API --
    const {
        isReady: selfReady, hasSession: selfHasSession, establishSession: selfEstablish,
        encryptMessage: selfEncrypt, decryptMessage: selfDecrypt
    } = useSignalSession(currentUserId);

    // -- Group Session API --
    const {
        isReady: groupReady, establishGroupSessions, generateGroupDistributionMap,
        processGroupDistribution, encryptGroupMessage, decryptGroupMessage,
        clearCiphersCache
    } = useGroupSignalSession(currentUserId);

    const isReady = directReady && groupReady && selfReady;

    // Track whether we've fired off our SenderKey distribution
    const distributedRef = useRef(false);
    // Track message IDs already decrypted this session to avoid re-decrypting
    const decryptedCacheRef = useRef(new Map());

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
                } else if (remoteDirectUserId) {
                    const bundles = await chatService.getPreKeyBundle(remoteDirectUserId);
                    await directEstablish(bundles);
                }

                // Establish sessions with our own other devices for self-sync
                const myBundles = await chatService.getPreKeyBundle(currentUserId);
                const myDeviceId = await signalStoreAdapter.getDeviceId();
                const otherMyBundles = myBundles.filter(b => b.deviceId !== myDeviceId);
                if (otherMyBundles.length > 0) {
                    await selfEstablish(otherMyBundles);
                }
            } catch (err) {
                console.error("Session Setup Error:", err);
                setError(err.message);
            }
        };

        initSession();
    }, [conversation, isReady, currentUserId, remoteDirectUserId, directHasSession, selfHasSession, isGroup, establishGroupSessions, directEstablish, selfEstablish]);

    const onReactionUpdate = useCallback(({ messageId, userId, emoji, isRemove }) => {
        setReactions(prev => {
            const list = prev[messageId] || [];
            let newList;
            if (isRemove) {
                newList = list.filter(r => !(r.userId === userId && r.emoji === emoji));
            } else {
                if (list.some(r => r.userId === userId && r.emoji === emoji)) {
                    newList = list;
                } else {
                    newList = [...list, { messageId, userId, emoji }];
                }
            }
            return { ...prev, [messageId]: newList };
        });
    }, []);

    // --- Decryption Routing (delegates to messageProcessing.js) ---
    const processMessages = useCallback(async (rawMessages, localMap = new Map()) => {
        return processMessagesCore(rawMessages, localMap, {
            isReady, isGroup, conversationId, currentUserId,
            decryptedCacheRef, directDecrypt, decryptGroupMessage, processGroupDistribution,
            onReactionUpdate,
            selfDecrypt,
        });
    }, [isReady, isGroup, conversationId, currentUserId, decryptGroupMessage, directDecrypt, processGroupDistribution, onReactionUpdate, selfDecrypt]);

    const processMessagesRef = useRef(processMessages);
    useEffect(() => { processMessagesRef.current = processMessages; }, [processMessages]);

    // --- Loading History ---
    const loadMessages = useCallback(async (cursor = null) => {
        if (!conversationId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await chatService.getMessages(conversationId, { limit: 50, cursor });

            // Fetch local plaintext cache BEFORE processing server messages
            const localMsgs = await signalStoreAdapter.getLocalMessages(conversationId);
            const localMap = new Map(localMsgs.map(m => [m.id, m]));

            // Load reactions from IndexedDB for conversation
            const list = await signalStoreAdapter.getReactionsForConversation(conversationId);
            const map = {};
            list.forEach(rec => {
                if (!map[rec.messageId]) map[rec.messageId] = [];
                map[rec.messageId].push(rec);
            });
            setReactions(map);

            const processedMessages = await processMessages(data.messages, localMap);

            if (cursor) {
                setMessages(prev => [...processedMessages, ...prev]);
            } else {
                setMessages(processedMessages);
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

    const handleMessagesRead = useCallback(({ conversationId: eventConversationId, userId }) => {
        if (eventConversationId !== conversationId) return;
        setMessages(prev => prev.map(msg => {
            if (msg.senderId !== userId && !msg.receipts?.some(r => r.userId === userId)) {
                return { ...msg, receipts: [...(msg.receipts || []), { userId, readAt: new Date().toISOString() }] };
            }
            return msg;
        }));
    }, [conversationId]);

    // --- Reactions sending ---
    const lastReactionTimeRef = useRef(0);
    const REACTION_COOLDOWN_MS = 1500;

    const reactToMessage = useCallback(async (messageId, emoji) => {
        const now = Date.now();
        if (now - lastReactionTimeRef.current < REACTION_COOLDOWN_MS) {
            console.warn('[Reaction] Rate limited');
            return;
        }
        lastReactionTimeRef.current = now;

        const targetMessage = messages.find(m => m.id === messageId);
        if (!targetMessage) return;

        const list = reactions[messageId] || [];
        const existing = list.find(r => r.userId === currentUserId && r.emoji === emoji);
        const isRemove = !!existing;

        try {
            // Optimistic update
            setReactions(prev => {
                const curList = prev[messageId] || [];
                let newList;
                if (isRemove) {
                    newList = curList.filter(r => !(r.userId === currentUserId && r.emoji === emoji));
                } else {
                    newList = [...curList, { messageId, userId: currentUserId, emoji }];
                }
                return { ...prev, [messageId]: newList };
            });

            await sendReaction(emoji, targetMessage, isRemove, {
                conversationId, isGroup, conversation, currentUserId,
                directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
                encryptGroupMessage, generateGroupDistributionMap, distributedRef,
                selfHasSession, selfEncrypt
            });
        } catch (err) {
            console.error('Failed to react to message:', err);
            // Revert optimistic update
            setReactions(prev => {
                const curList = prev[messageId] || [];
                let newList;
                if (isRemove) {
                    newList = [...curList, { messageId, userId: currentUserId, emoji }];
                } else {
                    newList = curList.filter(r => !(r.userId === currentUserId && r.emoji === emoji));
                }
                return { ...prev, [messageId]: newList };
            });
            showToast(err.message || 'Failed to send reaction');
        }
    }, [
        messages, reactions, conversationId, isGroup, conversation, currentUserId,
        directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
        encryptGroupMessage, generateGroupDistributionMap, selfHasSession, selfEncrypt
    ]);

    // --- Sending (delegates to messageSending.js) ---
    const sendSecureMessage = useCallback(async (plaintext, attachment = null) => {
        await sendSecureMessageCore(plaintext, attachment, {
            conversationId, isGroup, conversation, currentUserId,
            directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
            encryptGroupMessage, generateGroupDistributionMap, distributedRef,
            setMessages, setError,
            selfHasSession, selfEncrypt
        });
    }, [
        conversationId, isGroup, conversation, currentUserId, directHasSession,
        directEncrypt, directEstablish, remoteDirectUserId, encryptGroupMessage,
        generateGroupDistributionMap, selfHasSession, selfEncrypt
    ]);

    // --- Edit (delegates to messageActions.js) ---
    const editSecureMessage = useCallback(async (messageId, newPlaintext) => {
        await editSecureMessageCore(messageId, newPlaintext, {
            conversationId, messages, currentUserId, isGroup,
            directHasSession, directEncrypt, encryptGroupMessage,
            decryptedCacheRef, setMessages, setError,
            selfHasSession, selfEncrypt
        });
    }, [
        conversationId, messages, currentUserId, isGroup, directHasSession,
        directEncrypt, encryptGroupMessage, selfHasSession, selfEncrypt
    ]);

    // --- Delete (delegates to messageActions.js) ---
    const deleteSecureMessage = useCallback(async (messageId) => {
        await deleteSecureMessageCore(messageId, {
            conversationId, messages, currentUserId,
            decryptedCacheRef, setMessages, setError,
        });
    }, [conversationId, messages, currentUserId]);

    // --- Typing ---
    const setTypingStatus = useCallback((isTyping) => {
        if (!conversationId) return;
        socketClient.emit('typing', { conversationId, typing: isTyping });
    }, [conversationId]);

    // --- Socket Listeners ---
    useEffect(() => {
        if (!conversationId) { setMessages([]); return; }

        // Reset per-conversation state on conversation change
        distributedRef.current = false;
        decryptedCacheRef.current = new Map();
        clearCiphersCache();

        socketClient.emit('join_conversation', { conversationId }, () => { });

        const handleIncomingMessage = async ({ message }) => {
            if (message.conversationId !== conversationId) return;
            const myDeviceId = await signalStoreAdapter.getDeviceId();
            if (message.senderId === currentUserId && message.senderDeviceId === myDeviceId) return; // Handled optimistically

            const [processed] = await processMessagesRef.current([message]);
            if (processed) {
                setMessages(prev => {
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, processed];
                });
                chatService.markRead(conversationId, message.id).catch(() => { });
            }
        };

        const unsubs = [
            socketClient.on('message', handleIncomingMessage),
            socketClient.on('message:edited', async (editedMessage) => {
                if (editedMessage.conversationId !== conversationId) return;
                const myDeviceId = await signalStoreAdapter.getDeviceId();
                if (editedMessage.senderId === currentUserId && editedMessage.senderDeviceId === myDeviceId) return;

                try {
                    let plaintext;
                    if (isGroup) {
                        plaintext = await decryptGroupMessage(editedMessage.senderId, editedMessage.senderDeviceId, conversationId, editedMessage.content);
                    } else {
                        let slice = editedMessage.content;
                        if (slice && typeof slice === 'string' && slice.startsWith('{')) {
                            try {
                                const parsedMap = JSON.parse(slice);
                                if (parsedMap && typeof parsedMap === 'object' && !parsedMap.type) {
                                    const myAddressKey = `${currentUserId}.${myDeviceId}`;
                                    slice = parsedMap[myAddressKey];
                                }
                            } catch (e) {
                                // Not a JSON map
                            }
                        }
                        if (!slice) {
                            throw new Error('No slice for this device');
                        }

                        if (editedMessage.senderId === currentUserId) {
                            if (selfDecrypt) {
                                plaintext = await selfDecrypt(slice, editedMessage.senderDeviceId);
                            } else {
                                throw new Error('Self decrypt not available');
                            }
                        } else {
                            plaintext = await directDecrypt(slice, editedMessage.senderDeviceId);
                        }
                    }

                    const decryptedEdit = {
                        ...editedMessage, content: plaintext, isDecrypted: true, contentType: 'TEXT'
                    };
                    decryptedCacheRef.current.set(editedMessage.id, plaintext);
                    setMessages(prev => prev.map(m => m.id === editedMessage.id ? decryptedEdit : m));

                    signalStoreAdapter.saveLocalMessage(decryptedEdit).catch(e => {
                        console.error('Failed to update local cache for edited message', e);
                    });
                } catch (err) {
                    console.error('Failed to decrypt edited message', editedMessage.id, err);
                }
            }),
            socketClient.on('message:deleted', ({ id, conversationId: evtConvId }) => {
                if (evtConvId === conversationId) {
                    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true, content: 'Message deleted' } : m));
                    signalStoreAdapter.deleteLocalMessage(id).catch(e => {
                        console.error('Failed to remove local cache for deleted message', e);
                    });
                }
            }),
            socketClient.on('messages.read', handleMessagesRead),
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
    }, [conversationId, currentUserId, clearCiphersCache, handleMessagesRead, isGroup, decryptGroupMessage, directDecrypt, selfDecrypt]);

    // Initial message load
    useEffect(() => {
        if (conversationId && isReady) loadMessages();
    }, [conversationId, isReady, loadMessages]);

    return {
        messages, loading, error, hasOlder, loadOlder,
        sendSecureMessage, editSecureMessage, deleteSecureMessage,
        setTypingStatus, typingUsers,
        isSessionReady: isReady,
        reactions,
        reactToMessage
    };
}
