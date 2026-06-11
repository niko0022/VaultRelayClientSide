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

// Helper to deduce remote user in a 1-to-1 chat
function getDirectRemoteUserId(conversation, currentUserId) {
    if (!conversation || conversation.type !== 'DIRECT') return null;
    return conversation.participantAId === currentUserId
        ? conversation.participantBId
        : conversation.participantAId;
}

export function useMessages(conversation, currentUserId) {
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
    } = useSignalSession(remoteDirectUserId, 1);

    // -- Group Session API --
    const {
        isReady: groupReady, establishGroupSessions, generateGroupDistributionMap,
        processGroupDistribution, encryptGroupMessage, decryptGroupMessage,
        clearCiphersCache
    } = useGroupSignalSession(currentUserId);

    const isReady = directReady && groupReady;

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
                }
            } catch (err) {
                console.error("Session Setup Error:", err);
                setError(err.message);
            }
        };

        initSession();
    }, [conversation, isReady, currentUserId, remoteDirectUserId, directHasSession, isGroup, establishGroupSessions, directEstablish]);

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
        });
    }, [isReady, isGroup, conversationId, currentUserId, directHasSession, decryptGroupMessage, directDecrypt, processGroupDistribution, onReactionUpdate]);

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

    const handleMessagesRead = ({ conversationId: eventConversationId, userId }) => {
        if (eventConversationId !== conversationId) return;
        setMessages(prev => prev.map(msg => {
            if (msg.senderId !== userId && !msg.receipts?.some(r => r.userId === userId)) {
                return { ...msg, receipts: [...(msg.receipts || []), { userId, readAt: new Date().toISOString() }] };
            }
            return msg;
        }));
    }

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
                encryptGroupMessage, generateGroupDistributionMap, distributedRef
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
            alert(err.message || 'Failed to send reaction');
        }
    }, [
        messages, reactions, conversationId, isGroup, conversation, currentUserId,
        directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
        encryptGroupMessage, generateGroupDistributionMap
    ]);

    // --- Sending (delegates to messageSending.js) ---
    const sendSecureMessage = useCallback(async (plaintext, attachment = null) => {
        await sendSecureMessageCore(plaintext, attachment, {
            conversationId, isGroup, conversation, currentUserId,
            directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
            encryptGroupMessage, generateGroupDistributionMap, distributedRef,
            setMessages, setError,
        });
    }, [
        conversationId, isGroup, conversation, currentUserId, directHasSession,
        directEncrypt, encryptGroupMessage, generateGroupDistributionMap
    ]);

    // --- Edit (delegates to messageActions.js) ---
    const editSecureMessage = useCallback(async (messageId, newPlaintext) => {
        await editSecureMessageCore(messageId, newPlaintext, {
            conversationId, messages, currentUserId, isGroup,
            directHasSession, directEncrypt, encryptGroupMessage,
            decryptedCacheRef, setMessages, setError,
        });
    }, [conversationId, messages, currentUserId, isGroup, directHasSession, directEncrypt, encryptGroupMessage]);

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
            if (message.senderId === currentUserId) return; // Handled optimistically

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
                if (editedMessage.senderId === currentUserId) return;

                try {
                    let plaintext;
                    if (isGroup) {
                        plaintext = await decryptGroupMessage(editedMessage.senderId, conversationId, editedMessage.content);
                    } else {
                        plaintext = await directDecrypt(editedMessage.content);
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
    }, [conversationId, currentUserId, clearCiphersCache]);

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
