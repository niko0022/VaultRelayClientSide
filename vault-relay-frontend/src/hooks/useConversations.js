import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

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

                // Fetch missing conversation data outside the setState updater (pure function best practice)
                if (needsFetch) {
                    try {
                        const data = await chatService.getConversation(conversationId);
                        const fetchedConv = {
                            ...data.conversation,
                            lastMessage: data.lastMessage,
                            unreadCount: data.unreadCount
                        };
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
