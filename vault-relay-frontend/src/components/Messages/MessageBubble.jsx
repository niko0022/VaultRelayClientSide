import { formatTime } from '../../utils/timeFormat';
import AttachmentViewer from './AttachmentViewer';
import ReactionPicker from './ReactionPicker';

export default function MessageBubble({ msg, isMe, isEditing, handleContextMenu, reactions = [], onReact, currentUserId }) {
    const isDeleted = msg.deleted;
    const senderName = msg.sender?.displayName || msg.sender?.username;

    return (
        <div
            className={`flex gap-3 w-full group/row relative ${isMe ? 'justify-end' : 'justify-start'}`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
        >
            {/* Hover Reaction Picker */}
            {!isDeleted && !msg.isPending && (
                <div className={`absolute -top-3.5 z-30 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-all duration-200 ${isMe ? 'right-4' : 'left-12'}`}>
                    <ReactionPicker onReact={onReact} />
                </div>
            )}
            {/* Left side avatar for incoming messages */}
            {!isMe && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest shrink-0 flex items-center justify-center mt-1">
                    {!isDeleted && msg.sender?.avatarUrl ? (
                        <img
                            src={msg.sender.avatarUrl}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-highest text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                        </div>
                    )}
                </div>
            )}
            {/* Bubble & metadata column */}
            <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && !isDeleted && msg.sender && (
                    <span className="text-[11px] font-bold text-primary/80 ml-1 mb-0.5 select-none tracking-wide">
                        {senderName}
                    </span>
                )}
                <div className={`p-3.5 shadow-sm text-[15px] leading-relaxed break-words transition-all ${isDeleted
                    ? 'bg-surface-container-low text-on-surface-variant/50 italic rounded-xl border border-white/5'
                    : isMe
                        ? 'bg-secondary-container text-on-secondary-container rounded-tl-xl rounded-bl-xl rounded-br-xl'
                        : 'bg-surface-container-high text-on-surface rounded-tr-xl rounded-br-xl rounded-bl-xl border-l-[3px] border-primary/40'
                    } ${msg.isPending ? 'opacity-70' : ''} ${isEditing ? 'ring-2 ring-primary/60' : ''}`}>
                    {isDeleted ? (
                        <p className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">block</span>
                            This message was deleted
                        </p>
                    ) : (
                        <>
                            {msg.content && <p>{msg.content}</p>}
                            {(msg.attachmentUrl || msg.attachmentMeta) && (
                                <AttachmentViewer
                                    attachmentUrl={msg.attachmentUrl}
                                    attachmentMeta={msg.attachmentMeta}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* REACTION PILLS */}
                {!isDeleted && reactions && reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 select-none">
                        {Object.entries(
                            reactions.reduce((acc, r) => {
                                if (!acc[r.emoji]) acc[r.emoji] = [];
                                acc[r.emoji].push(r.userId);
                                return acc;
                            }, {})
                        ).map(([emoji, userIds]) => {
                            const hasReacted = userIds.includes(currentUserId);
                            return (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(emoji)}
                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                        hasReacted
                                            ? 'bg-primary/20 text-primary border border-primary/35 shadow-[0_0_8px_rgba(0,229,255,0.05)]'
                                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border border-white/5'
                                    }`}
                                    title={`${userIds.length} reaction(s)`}
                                >
                                    <span>{emoji}</span>
                                    <span className="text-[10px]">{userIds.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-on-surface-variant/60">{formatTime(msg.createdAt)}</span>
                    {msg.editedAt && !isDeleted && (
                        <span className="text-[10px] text-on-surface-variant/40 italic">edited</span>
                    )}
                    {msg.contentType === 'SIGNAL_ENCRYPTED' && (
                        <span className="text-[10px] text-primary/70 uppercase font-bold tracking-wider flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">lock</span>
                            Secure
                        </span>
                    )}
                    {msg.isPending && (
                        <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50 animate-pulse">schedule</span>
                    )}
                    {/* READ RECEIPTS / AVATARS */}
                    {isMe && !isDeleted && !msg.isPending && (
                        <div className="flex -space-x-1.5 flex-row-reverse items-center justify-end select-none ml-1">
                            {(msg.receipts || []).length === 0 ? (
                                <span className="material-symbols-outlined text-[15px] text-on-surface-variant/40" title="Sent">
                                    check
                                </span>
                            ) : (
                                msg.receipts.map(receipt => {
                                    const displayName = receipt.user?.displayName || receipt.user?.username || 'User';
                                    const avatarUrl = receipt.user?.avatarUrl;

                                    return (
                                        <div
                                            key={receipt.userId}
                                            className="w-4 h-4 rounded-full overflow-hidden bg-surface-container-highest ring-1 ring-background shrink-0 flex items-center justify-center"
                                            title={`Seen by ${displayName}`}
                                        >
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-surface-container-highest text-on-surface-variant">
                                                    <span className="material-symbols-outlined text-[10px]">person</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
