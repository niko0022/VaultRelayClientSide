import { formatTime } from '../../utils/timeFormat';

export default function ConversationListItem({ conv, user, isSelected, selectConversation }) {
    const isUnread = conv.unreadCount > 0;

    // Resolve display name for list preview
    let peerName;
    if (conv.type === 'GROUP') {
        peerName = conv.title || 'Group Chat';
    } else {
        peerName = conv.participantAId === user?.id
            ? (conv.participantB?.displayName || conv.participantB?.username)
            : (conv.participantA?.displayName || conv.participantA?.username);
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
            className={`p-3 rounded-lg cursor-pointer flex gap-3 transition-colors relative ${isSelected ? 'bg-surface-container-high' : 'hover:bg-surface-container-high/50'}`}
        >
            {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r"></div>}

            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 relative">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
                {isUnread && (
                    <div className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-primary rounded-full border-2 border-surface-container-low"></div>
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                    <h3 className={`font-headline text-sm truncate ${isUnread || isSelected ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                        {peerName || 'Unknown User'}
                    </h3>
                    {lastMsg && (
                        <span className="text-[10px] text-on-surface-variant whitespace-nowrap ml-2">
                            {formatTime(lastMsg.createdAt)}
                        </span>
                    )}
                </div>
                <p className={`text-xs truncate ${isUnread ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                    {previewText}
                </p>
            </div>
        </div>
    );
}
