import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavBar from '../components/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../hooks/useFriends';
import { chatService } from '../services/chatService';

export default function Contacts() {
    const { user } = useAuth();
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

    const handleAccept = async (friendshipId) => {
        setActionLoading(friendshipId);
        try {
            await acceptRequest(friendshipId);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (friendshipId) => {
        setActionLoading(friendshipId);
        try {
            await declineRequest(friendshipId);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleStartMessage = async (friendUserId) => {
        try {
            const data = await chatService.getOrCreateDirectConversation(friendUserId);
            const convId = data.conversation?.id || data.id;
            navigate('/messages', { state: { openConversationId: convId } });
        } catch (err) {
            console.error('Failed to open conversation:', err);
        }
    };

    const handleRemoveFriend = async () => {
        if (!selectedFriend) return;
        try {
            await removeFriend(selectedFriend.friendshipId);
            setSelectedFriend(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBlockFriend = async () => {
        if (!selectedFriend) return;
        try {
            await blockFriend(selectedFriend.user.id);
            setSelectedFriend(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUnblock = async (userId) => {
        try {
            await unblockUser(userId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCopyCode = () => {
        if (!user?.friendCode) return;
        navigator.clipboard.writeText(user.friendCode);
        setCopied(true);
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-background text-on-background font-body h-screen flex overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
            <SideNavBar />

            <div className="flex flex-1 ml-72 h-screen overflow-hidden">

                {/* Left Panel: Contact List */}
                <main className="flex-1 lg:flex-none lg:w-96 bg-surface-container-low kinetic-grid flex flex-col border-r border-outline-variant/10 relative z-10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
                    <div className="p-6 space-y-4">
                        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-background">Relay Contacts</h2>

                        {/* Your Friend Code */}
                        {user?.friendCode && (
                            <button
                                onClick={handleCopyCode}
                                className="w-full flex items-center justify-between gap-2 bg-primary-container/10 border border-primary-container/20 rounded-lg px-4 py-2.5 group hover:border-primary-container/40 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined text-primary text-sm">fingerprint</span>
                                    <span className="text-xs font-mono text-primary/80 truncate">{user.friendCode}</span>
                                </div>
                                <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        )}

                        {/* Add Friend Search */}
                        <form onSubmit={handleSendRequest} className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">person_add</span>
                            <input
                                className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container focus:outline-none text-on-surface text-sm pl-10 pr-20 py-3 rounded-lg placeholder:text-on-surface-variant/50 transition-all font-mono"
                                placeholder="Enter friend code..."
                                type="text"
                                value={searchCode}
                                onChange={(e) => { setSearchCode(e.target.value); setSearchStatus(null); }}
                            />
                            <button
                                type="submit"
                                disabled={!searchCode.trim() || searchLoading}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary-container text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {searchLoading ? '...' : 'Add'}
                            </button>
                        </form>

                        {/* Search Feedback */}
                        {searchStatus && (
                            <div className={`text-xs px-3 py-2 rounded-lg ${searchStatus.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                                {searchStatus.message}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">

                        {/* Pending Requests Section */}
                        {pendingRequests.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                                        Pending Requests
                                    </span>
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-primary">{pendingRequests.length}</span>
                                    </div>
                                </div>
                                {pendingRequests.map(req => (
                                    <div key={req.friendshipId} className="p-3 bg-primary-container/5 ring-1 ring-primary-container/20 rounded-xl mb-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 overflow-hidden">
                                                {req.user.avatarUrl ? (
                                                    <img src={req.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-headline font-bold text-sm text-on-surface truncate">
                                                    {req.user.displayName || req.user.username}
                                                </h3>
                                                <span className="text-[10px] text-on-surface-variant">wants to connect</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleAccept(req.friendshipId)}
                                                disabled={actionLoading === req.friendshipId}
                                                className="flex-1 bg-primary-container text-on-primary-container text-xs font-bold py-2 rounded-lg uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleDecline(req.friendshipId)}
                                                disabled={actionLoading === req.friendshipId}
                                                className="flex-1 bg-surface-container-highest/30 text-on-surface-variant text-xs font-bold py-2 rounded-lg uppercase tracking-wider hover:text-error hover:bg-error/10 transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Friends Section Header */}
                        {friends.length > 0 && (
                            <div className="flex items-center gap-2 px-2 py-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                                    Friends
                                </span>
                                <span className="text-[10px] text-on-surface-variant/50">{friends.length}</span>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="p-8 text-center text-sm text-on-surface-variant">Loading contacts...</div>
                        )}

                        {/* Empty State */}
                        {!loading && friends.length === 0 && pendingRequests.length === 0 && (
                            <div className="p-8 text-center space-y-3">
                                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">group_add</span>
                                <p className="text-sm text-on-surface-variant">No contacts yet.</p>
                                <p className="text-xs text-on-surface-variant/60">Enter a friend code above to add someone.</p>
                            </div>
                        )}

                        {/* Friends List */}
                        {friends.map(friend => {
                            const isSelected = selectedFriend?.friendshipId === friend.friendshipId;
                            return (
                                <div
                                    key={friend.friendshipId}
                                    onClick={() => setSelectedFriend(friend)}
                                    className={`p-4 rounded-xl cursor-pointer group transition-all duration-200 ${isSelected ? 'bg-primary-container/5 ring-1 ring-primary-container/20' : 'hover:bg-surface-container-low'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest shrink-0">
                                            {friend.user.avatarUrl ? (
                                                <img
                                                    alt=""
                                                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                    src={friend.user.avatarUrl}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-on-surface-variant text-2xl">person</span>
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary-container rounded-full ring-2 ring-background"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className={`font-headline text-sm truncate ${isSelected ? 'font-bold text-on-surface' : 'font-medium text-on-surface/80 group-hover:text-on-surface'} transition-colors`}>
                                                    {friend.user.displayName || friend.user.username}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="material-symbols-outlined text-on-surface-variant text-[14px]">shield</span>
                                                <span className="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant">Secure Contact</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Blocked Users Section */}
                        {blockedUsers.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-outline-variant/10">
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">
                                        Blocked
                                    </span>
                                    <span className="text-[10px] text-error/40">{blockedUsers.length}</span>
                                </div>
                                {blockedUsers.map(blocked => (
                                    <div key={blocked.friendshipId} className="p-3 rounded-xl flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 opacity-40">
                                            {blocked.user.avatarUrl ? (
                                                <img src={blocked.user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full grayscale" />
                                            ) : (
                                                <span className="material-symbols-outlined text-on-surface-variant">person</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm text-on-surface-variant/60 truncate">
                                                {blocked.user.displayName || blocked.user.username}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => handleUnblock(blocked.user.id)}
                                            className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/40 hover:text-primary px-2 py-1 rounded transition-colors cursor-pointer"
                                        >
                                            Unblock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Panel: Contact Details / Empty State */}
                <section className="hidden md:flex flex-1 bg-surface-container-lowest flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-container/10 blur-[150px] -z-10 rounded-full pointer-events-none"></div>

                    {!selectedFriend ? (
                        /* No friend selected */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4">contacts</span>
                            <h2 className="text-xl font-headline text-on-surface">Select a Contact</h2>
                            <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
                                Choose a friend from the list to view their profile and start a secure conversation.
                            </p>
                        </div>
                    ) : (
                        /* Friend detail view */
                        <div className="max-w-5xl w-full mx-auto p-16 flex flex-col items-center justify-center flex-1 h-full overflow-y-auto">
                            <div className="flex flex-col items-center gap-12 w-full mt-auto mb-auto">

                                {/* Avatar */}
                                <div className="relative group mx-auto">
                                    <div className="w-64 h-64 rounded-[2rem] overflow-hidden ring-4 ring-primary-container/20 shadow-[0_0_50px_rgba(0,229,255,0.1)] transition-transform duration-500 group-hover:scale-[1.02]">
                                        {selectedFriend.user.avatarUrl ? (
                                            <img alt="" className="w-full h-full object-cover" src={selectedFriend.user.avatarUrl} />
                                        ) : (
                                            <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                                                <span className="material-symbols-outlined text-8xl text-on-surface-variant/40">person</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Identity Info */}
                                <div className="flex-1 space-y-10 text-center w-full max-w-2xl mx-auto">
                                    <div className="space-y-4">
                                        <div className="flex flex-col items-center gap-4">
                                            <h2 className="font-headline text-5xl lg:text-7xl font-bold tracking-tighter text-on-background">
                                                {selectedFriend.user.displayName || selectedFriend.user.username}
                                            </h2>
                                            <span className="bg-primary-container/10 text-primary-container text-xs font-bold px-4 py-1.5 rounded-full border border-primary-container/20 uppercase tracking-[0.2em]">
                                                Secure Contact
                                            </span>
                                        </div>
                                        {selectedFriend.user.friendCode && (
                                            <div className="flex items-center justify-center gap-2 mt-4">
                                                <span className="material-symbols-outlined text-primary-container/50 text-base">fingerprint</span>
                                                <p className="text-base lg:text-lg font-mono font-bold text-primary-container/80 tracking-widest uppercase">
                                                    {selectedFriend.user.friendCode}
                                                </p>
                                            </div>
                                        )}
                                        {selectedFriend.since && (
                                            <p className="text-sm text-on-surface-variant">
                                                Friends since {new Date(selectedFriend.since).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-6 w-full max-w-md mx-auto pt-4">
                                        <button
                                            onClick={() => handleStartMessage(selectedFriend.user.id)}
                                            className="w-full bg-primary-container text-on-primary-container px-12 py-6 rounded-xl font-headline font-bold uppercase tracking-[0.2em] text-sm lg:text-base hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-2xl">forum</span>
                                            Start Secure Message
                                        </button>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={handleBlockFriend}
                                                className="bg-surface-container-highest/20 border border-outline-variant/20 text-on-surface/50 hover:text-on-surface hover:border-outline-variant/60 hover:bg-surface-container-highest/40 px-6 py-4 rounded-xl font-headline font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
                                            >
                                                <span className="material-symbols-outlined text-lg opacity-50 group-hover:opacity-100 transition-opacity">block</span>
                                                Block Contact
                                            </button>
                                            <button
                                                onClick={handleRemoveFriend}
                                                className="bg-surface-container-highest/20 border border-outline-variant/20 text-on-surface/50 hover:text-error hover:border-error/40 hover:bg-error/5 px-6 py-4 rounded-xl font-headline font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
                                            >
                                                <span className="material-symbols-outlined text-lg opacity-50 group-hover:opacity-100 transition-opacity">person_remove</span>
                                                Unfriend
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
