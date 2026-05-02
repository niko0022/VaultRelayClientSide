import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { chatService } from '../services/chatService';

export default function CreateGroupModal({ onClose }) {
    const { friends, loading } = useFriends();

    const [title, setTitle] = useState('');
    const [selectedFriends, setSelectedFriends] = useState(new Set());
    const [memberCanInvite, setMemberCanInvite] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const toggleFriend = (friendId) => {
        const newSet = new Set(selectedFriends);
        if (newSet.has(friendId)) {
            newSet.delete(friendId);
        } else {
            newSet.add(friendId);
        }
        setSelectedFriends(newSet);
    };

    const cleanTitle = title.trim();

    const handleCreate = async () => {
        if (!cleanTitle) {
            setError('Please enter a group title');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await chatService.createGroupConversation({
                title: cleanTitle,
                participantIds: Array.from(selectedFriends),
                memberCanInvite: memberCanInvite
            });
            onClose();
        } catch (err) {
            console.error('Failed to create group:', err);
            setError(err.message || 'Failed to create group');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface-container-high border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-headline text-xl font-bold text-on-surface">New Group Chat</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-white/5 cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="p-3 bg-error/10 border border-error/20 text-error rounded-lg text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    {/* Title Input */}
                    <div>
                        <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Group Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Group Name"
                            className="w-full bg-surface-container border border-white/10 text-on-surface text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Restricted Toggle */}
                    <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-white/5">
                        <div>
                            <div className="text-sm font-bold text-on-surface">Open Invites</div>
                            <div className="text-xs text-on-surface-variant mt-1">Allow any member to invite others to the group.</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={memberCanInvite}
                                onChange={(e) => setMemberCanInvite(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {/* Friend Selection */}
                    <div>
                        <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                            Select Members ({selectedFriends.size})
                        </label>

                        {loading ? (
                            <div className="text-center text-sm text-on-surface-variant py-4">Loading friends...</div>
                        ) : friends.length === 0 ? (
                            <div className="text-center text-sm text-on-surface-variant py-4 bg-surface-container rounded-lg">
                                You don't have any friends to add yet.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                                {friends.map((friendObj) => {
                                    const friendUserId = friendObj.user.id;
                                    const isSelected = selectedFriends.has(friendUserId);

                                    return (
                                        <div
                                            key={friendObj.friendshipId}
                                            onClick={() => toggleFriend(friendUserId)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                ? 'bg-primary/20 border-primary/50'
                                                : 'bg-surface-container border-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-highest flex-shrink-0">
                                                {friendObj.user.avatarUrl ? (
                                                    <img src={friendObj.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-bold">
                                                        {(friendObj.user.displayName || friendObj.user.username || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-on-surface truncate">
                                                    {friendObj.user.displayName || friendObj.user.username}
                                                </div>
                                                <div className="text-xs text-on-surface-variant truncate">
                                                    @{friendObj.user.username}
                                                </div>
                                            </div>

                                            {/* Checkbox circle */}
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                                                }`}>
                                                {isSelected && <span className="material-symbols-outlined text-[14px] text-on-primary">check</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Footer */}
                <div className="p-6 border-t border-white/5 bg-surface-container-low">
                    <button
                        onClick={handleCreate}
                        disabled={isSubmitting || !cleanTitle}
                        className="w-full bg-primary text-on-primary font-bold text-sm py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-[18px]">group_add</span>
                        )}
                        Create Group
                    </button>
                </div>
            </div>
        </div>
    );
}
