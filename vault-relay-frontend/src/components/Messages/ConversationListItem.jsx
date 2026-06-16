import { formatTime } from '../../utils/timeFormat';

export default function ConversationListItem({ conv, user, isSelected, selectConversation }) {
    const isUnread = conv.unreadCount > 0;

    // Resolve display name and peer profile for direct chats
    const peer = conv.type === 'DIRECT'
        ? (conv.participantAId === user?.id ? conv.participantB : conv.participantA)
        : null;
    const isOnline = peer?.status === 'ONLINE';

    let peerName;
    if (conv.type === 'GROUP') {
        peerName = conv.title || 'Group Chat';
    } else {
        peerName = peer?.displayName || 'Unknown User';
    }

    // Determine preview text
    let previewText = "No messages yet.";
    const lastMsg = conv.lastMessage;
    if (lastMsg) {
        if (lastMsg.contentType === 'SIGNAL_ENCRYPTED') {
            previewText = 'message';
        } else {
            previewText = lastMsg.content;
        }
    }

    return (
        <div
            onClick={() => selectConversation(conv.id)}
            className={`flex items-center p-3 mb-1 rounded-2xl cursor-pointer transition-colors relative ${
                isSelected
                    ? 'bg-gray-100 shadow-sm border border-gray-200/50'
                    : 'hover:bg-gray-50'
            }`}
        >
            {/* Selection indicator bar */}
            {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-black rounded-r-full" />
            )}

            {/* Avatar */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-100">
                {peer?.avatarUrl ? (
                    <img
                        src={peer.avatarUrl}
                        alt={peerName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                )}
                {/* Online badge */}
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                )}
            </div>

            {/* Content */}
            <div className="ml-4 flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm truncate ${isUnread || isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
                        {peerName}
                    </h3>
                    {lastMsg && (
                        <span className={`text-xs whitespace-nowrap ml-2 ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                            {formatTime(lastMsg.createdAt)}
                        </span>
                    )}
                </div>
                <p className={`text-xs truncate pr-6 ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {previewText}
                </p>
            </div>

            {/* Right side indicator */}
            <div className="absolute right-4 bottom-4">
                {isUnread ? (
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white">
                        {conv.unreadCount}
                    </div>
                ) : lastMsg && (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                )}
            </div>
        </div>
    );
}
