import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

// Reusable helper to fetch and format conversation data
async function fetchAndFormatConversation(conversationId) {
    const data = await chatService.getConversation(conversationId);
    return {
        ...data.conversation,
        lastMessage: data.lastMessage,
        unreadCount: data.unreadCount
    };
}

export function useConversations() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasNext, setHasNext] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState(null);

    const loadConversations = useCallback(async (cursor = null) => {
        setLoading(true);
        setError(null);
        try {
            const data = await chatService.listConversations({ limit: 20, cursor });
            if (cursor) {
                setConversations(prev => [...prev, ...data.conversations]);
            } else {
                setConversations(data.conversations);
            }
            setNextCursor(data.nextCursor);
            setHasNext(data.hasNext);
        } catch (err) {
            console.error('Failed to load conversations', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (hasNext && nextCursor && !loading) {
            loadConversations(nextCursor);
        }
    }, [hasNext, nextCursor, loading, loadConversations]);

    const selectConversation = useCallback((id) => {
        setSelectedConversationId(id);
        // Clear unread count locally when opened
        setConversations(prev => prev.map(conv =>
            conv.id === id ? { ...conv, unreadCount: 0 } : conv
        ));
    }, []);

    useEffect(() => {
        loadConversations();
        socketClient.connect();

        const unsubs = [
            socketClient.on('conversation.created', ({ conversation }) => {
                setConversations(prev => {
                    if (prev.find(c => c.id === conversation.id)) return prev;
                    return [conversation, ...prev];
                });
            }),
            socketClient.on('presence', ({ userId, online, lastSeen }) => {
                const status = online ? 'ONLINE' : 'OFFLINE';
                setConversations(prev => prev.map(conv => {
                    const participantA = conv.participantA?.id === userId
                        ? { ...conv.participantA, status, lastSeen }
                        : conv.participantA;
                    const participantB = conv.participantB?.id === userId
                        ? { ...conv.participantB, status, lastSeen }
                        : conv.participantB;
                    const participants = conv.participants?.map(p =>
                        p.userId === userId ? { ...p, user: { ...p.user, status, lastSeen } } : p
                    );

                    return { ...conv, participantA, participantB, participants };
                }));
            }),
            socketClient.on('conversation.invite', async ({ conversationId }) => {
                try {
                    const fetchedConv = await fetchAndFormatConversation(conversationId);
                    setConversations(prev => {
                        if (prev.some(c => c.id === conversationId)) return prev;
                        return [fetchedConv, ...prev];
                    });
                } catch (err) {
                    console.error("[Socket] Failed to fetch conversation details", err);
                }
            }),
            socketClient.on('participant.added', async ({ conversationId }) => {
                try {
                    const fetchedConv = await fetchAndFormatConversation(conversationId);
                    setConversations(prev => prev.map(c => c.id === conversationId ? fetchedConv : c));
                } catch (err) {
                    console.error("[Socket] Failed to update conversation after participant added", err);
                }
            }),
            socketClient.on('participant.removed', async ({ conversationId }) => {
                try {
                    const fetchedConv = await fetchAndFormatConversation(conversationId);
                    setConversations(prev => prev.map(c => c.id === conversationId ? fetchedConv : c));
                } catch (err) {
                    console.error("[Socket] Failed to update conversation after participant removed", err);
                }
            }),
            socketClient.on('conversation.removed', ({ conversationId }) => {
                signalStoreAdapter.clearLocalMessages(conversationId).catch(err => console.error('Failed to wipe local messages', err));

                setConversations(prev => {
                    const targetConv = prev.find(c => c.id === conversationId);

                    if (targetConv && Array.isArray(targetConv.participants)) {
                        const otherConvs = prev.filter(c => c.id !== conversationId);

                        targetConv.participants.forEach(p => {
                            const isStillActiveInOtherChat = otherConvs.some(oc =>
                                oc.participants?.some(op => op.userId === p.userId)
                            );
                            if (!isStillActiveInOtherChat) {
                                const addressKey = `${p.userId}.1`;
                                signalStoreAdapter.removeSession(addressKey)
                                    .catch(err => console.error('Failed to sever signal session', err));
                                signalStoreAdapter.removeIdentity(addressKey)
                                    .catch(err => console.error('Failed to wipe identity', err));
                            }
                        });
                    }
                    return prev.filter(c => c.id !== conversationId);
                });
                setSelectedConversationId(current => current === conversationId ? null : current);
            }),
            socketClient.on('conversation.updated', async ({ conversationId, lastMessage, unreadCount, updatedAt }) => {
                let needsFetch = false;

                setConversations(prev => {
                    const conv = prev.find(c => c.id === conversationId);
                    if (!conv) {
                        // The chat isn't loaded in memory — flag for out-of-band fetch.
                        needsFetch = true;
                        return prev;
                    }
                    // Sort to bring this conversation to the top
                    const updatedConv = {
                        ...conv,
                        lastMessage: lastMessage || conv.lastMessage,
                        unreadCount: unreadCount !== undefined ? unreadCount : conv.unreadCount,
                        updatedAt: updatedAt || conv.updatedAt
                    };
                    const filtered = prev.filter(c => c.id !== conversationId);
                    return [updatedConv, ...filtered];
                });

                // Fetch missing conversation data outside the setState updater 
                if (needsFetch) {
                    try {
                        const fetchedConv = await fetchAndFormatConversation(conversationId);
                        setConversations(currentList => {
                            if (currentList.find(c => c.id === conversationId)) return currentList;
                            return [fetchedConv, ...currentList];
                        });
                    } catch (err) {
                        console.error("[Socket] Failed to fetch missing conversation", err);
                    }
                }
            }),
            socketClient.on('conversation.deleted', ({ conversationId, participants }) => {
                // Instantly wipe E2EE data locally
                signalStoreAdapter.clearLocalMessages(conversationId).catch(err => console.error('Failed to wipe local messages', err));
                if (participants && Array.isArray(participants)) {
                    participants.forEach(p => {
                        // Signal protocol addresses usually stringify to 'userId.deviceId'
                        const addressKey = `${p.userId}.1`;
                        signalStoreAdapter.removeSession(addressKey).catch(err => console.error('Failed to sever signal session', err));
                        // Also wipe stored identity so fresh handshake isn't blocked by "untrusted identity"
                        signalStoreAdapter.removeIdentity(addressKey).catch(err => console.error('Failed to wipe identity', err));
                    });
                }

                setConversations(prev => prev.filter(c => c.id !== conversationId));
                setSelectedConversationId(current => current === conversationId ? null : current);
            })
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, [loadConversations]);

    return {
        conversations,
        loading,
        error,
        hasNext,
        loadMore,
        selectedConversationId,
        selectConversation
    };
}
