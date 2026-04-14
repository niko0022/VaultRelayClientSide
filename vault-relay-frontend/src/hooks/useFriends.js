import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';

export function useFriends() {
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching ---

    const loadFriends = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [friendsData, pendingData, blockedData] = await Promise.all([
                chatService.listFriends(),
                chatService.listPendingRequests(),
                chatService.listBlockedUsers()
            ]);
            setFriends(friendsData.friends || []);
            setPendingRequests(pendingData.requests || []);
            setBlockedUsers(blockedData.blocked || []);
        } catch (err) {
            console.error('Failed to load friends:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Actions ---

    const sendRequest = useCallback(async (friendCode) => {
        try {
            const result = await chatService.sendFriendRequest(friendCode);

            // If the backend auto-accepted (they already sent us a request), refresh the list
            if (result.type === 'accepted') {
                await loadFriends();
            }

            return result;
        } catch (err) {
            throw err;
        }
    }, [loadFriends]);

    const acceptRequest = useCallback(async (friendshipId) => {
        try {
            const result = await chatService.acceptFriendRequest(friendshipId);

            // Move from pending to friends list
            setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));

            // Refresh friends to get the full friend object from the server
            await loadFriends();

            return result;
        } catch (err) {
            console.error('Failed to accept friend request:', err);
            throw err;
        }
    }, [loadFriends]);

    const cancelRequest = useCallback(async (friendshipId) => {
        try {
            await chatService.cancelFriendRequest(friendshipId);
            setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
        } catch (err) {
            console.error('Failed to cancel friend request:', err);
            throw err;
        }
    }, []);

    const declineRequest = useCallback(async (friendshipId) => {
        try {
            await chatService.declineFriendRequest(friendshipId);
            setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
        } catch (err) {
            console.error('Failed to decline friend request:', err);
            throw err;
        }
    }, []);

    const removeFriend = useCallback(async (friendshipId) => {
        try {
            await chatService.removeFriend(friendshipId);
            setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
        } catch (err) {
            console.error('Failed to remove friend:', err);
            throw err;
        }
    }, []);

    const blockFriend = useCallback(async (userId) => {
        try {
            const result = await chatService.blockUser(userId);
            // Move from friends list to blocked list
            const blockedFriend = friends.find(f => f.user.id === userId);
            setFriends(prev => prev.filter(f => f.user.id !== userId));
            if (blockedFriend) {
                setBlockedUsers(prev => [...prev, {
                    friendshipId: result.friendship?.id || blockedFriend.friendshipId,
                    user: blockedFriend.user,
                    blockedAt: new Date().toISOString(),
                }]);
            }
        } catch (err) {
            console.error('Failed to block user:', err);
            throw err;
        }
    }, [friends]);

    const unblockUser = useCallback(async (userId) => {
        try {
            await chatService.unblockUser(userId);
            // Remove from blocked list and refresh friends (they return to ACCEPTED)
            setBlockedUsers(prev => prev.filter(b => b.user.id !== userId));
            await loadFriends();
        } catch (err) {
            console.error('Failed to unblock user:', err);
            throw err;
        }
    }, [loadFriends]);

    // --- Real-time Socket Events ---

    useEffect(() => {
        loadFriends();

        const unsubs = [
            // Someone sent us a friend request
            socketClient.on('friendHandler.request', ({ friendship }) => {
                // We need the requester info — refetch pending to get populated data
                chatService.listPendingRequests()
                    .then(data => setPendingRequests(data.requests || []))
                    .catch(err => console.error('Failed to refresh pending requests:', err));
            }),

            // Our outgoing request was accepted
            socketClient.on('friendHandler.accepted', () => {
                loadFriends();
            }),

            // Our outgoing request was declined
            socketClient.on('friendHandler.declined', ({ friendshipId }) => {
                setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
            }),

            // Someone cancelled their request to us
            socketClient.on('friendHandler.cancelled', ({ friendshipId }) => {
                setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
            }),

            // Someone unfriended us
            socketClient.on('friendHandler.removed', ({ friendshipId }) => {
                setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
            }),
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, [loadFriends]);

    return {
        friends,
        pendingRequests,
        blockedUsers,
        loading,
        error,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        blockFriend,
        unblockUser,
        cancelRequest,
        refresh: loadFriends,
    };
}
