import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/chatService';
import { useFriends } from './useFriends';

export function useContactActions(user) {
    const navigate = useNavigate();
    const {
        friends,
        pendingRequests,
        blockedUsers,
        loading,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        blockFriend,
        unblockUser,
    } = useFriends();

    // Selected friend for detail panel
    const [selectedFriend, setSelectedFriend] = useState(null);

    // Friend code search state
    const [searchCode, setSearchCode] = useState('');
    const [searchStatus, setSearchStatus] = useState(null); // { type: 'success'|'error', message }
    const [searchLoading, setSearchLoading] = useState(false);

    // Action feedback
    const [actionLoading, setActionLoading] = useState(null); // friendshipId being acted on

    // Copy-to-clipboard state
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        const code = searchCode.trim();
        if (!code || searchLoading) return;

        setSearchLoading(true);
        setSearchStatus(null);
        try {
            const result = await sendRequest(code);
            if (result.type === 'accepted') {
                setSearchStatus({ type: 'success', message: 'Friend request auto-accepted! They already sent you one.' });
            } else {
                setSearchStatus({ type: 'success', message: 'Friend request sent successfully!' });
            }
            setSearchCode('');
        } catch (err) {
            setSearchStatus({ type: 'error', message: err.message });
        } finally {
            setSearchLoading(false);
        }
    };


    // Wraps an action with the actionLoading state
    const executeWithLoading = async (id, actionFn) => {
        setActionLoading(id);
        try {
            await actionFn(id);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    // Wraps an action that requires a selected friend, and clears selection on success
    const executeWithSelected = async (id, actionFn) => {
        if (!selectedFriend) return;
        try {
            await actionFn(id);
            setSelectedFriend(null);
        } catch (err) {
            console.error(err);
        }
    };

    // --- Concrete Actions ---

    const handleAccept = (friendshipId) => executeWithLoading(friendshipId, acceptRequest);

    const handleDecline = (friendshipId) => executeWithLoading(friendshipId, declineRequest);

    const handleRemoveFriend = () => executeWithSelected(selectedFriend?.friendshipId, removeFriend);

    const handleBlockFriend = () => executeWithSelected(selectedFriend?.user?.id, blockFriend);

    const handleUnblock = async (userId) => {
        try { await unblockUser(userId); } catch (err) { console.error(err); }
    };

    const handleStartMessage = async (friendUserId) => {
        try {
            const data = await chatService.getOrCreateDirectConversation(friendUserId);
            const convId = data.conversation?.id;
            navigate('/messages', { state: { openConversationId: convId } });
        } catch (err) {
            console.error('Failed to open conversation:', err);
        }
    };

    const handleCopyCode = () => {
        if (!user?.friendCode) return;
        navigator.clipboard.writeText(user.friendCode);
        setCopied(true);
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    };

    return {
        friends,
        pendingRequests,
        blockedUsers,
        loading,
        selectedFriend,
        setSelectedFriend,
        searchCode,
        setSearchCode,
        searchStatus,
        setSearchStatus,
        searchLoading,
        actionLoading,
        copied,
        handleSendRequest,
        handleAccept,
        handleDecline,
        handleStartMessage,
        handleRemoveFriend,
        handleBlockFriend,
        handleUnblock,
        handleCopyCode
    };
}
