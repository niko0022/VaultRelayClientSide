import { useState, useRef, useEffect } from 'react';
import { formatTime } from '../../utils/timeFormat';
import AttachmentViewer from './AttachmentViewer';
import ReactionPicker from './ReactionPicker';

export default function MessageBubble({ msg, isMe, isEditing, handleContextMenu, reactions = [], onReact, currentUserId, isBlocked = false }) {
    const isDeleted = msg.deleted;
    const senderName = msg.sender?.displayName || msg.sender?.username;
    const [pickerOpen, setPickerOpen] = useState(false);
    const pickerRef = useRef(null);

    // Close picker when clicking outside
    useEffect(() => {
        if (!pickerOpen) return;
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pickerOpen]);

    return (
        <div
            className={`flex gap-3 w-full group/row relative ${isMe ? 'justify-end' : 'justify-start'}`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
        >
            {/* Left side avatar for incoming messages */}
            {!isMe && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center mt-1 border border-gray-200">
                    {!isDeleted && msg.sender?.avatarUrl ? (
                        <img
                            src={msg.sender.avatarUrl}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bubble & metadata column */}
            <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender name for incoming */}
                {!isMe && !isDeleted && msg.sender && (
                    <span className="text-[11px] font-semibold text-gray-500 ml-1 mb-0.5 select-none tracking-wide">
                        {senderName}
                    </span>
                )}

                {/* Message bubble */}
                <div className={`p-4 shadow-sm text-[15px] leading-relaxed break-words transition-all ${isDeleted
                    ? 'bg-gray-100 text-gray-400 italic rounded-2xl'
                    : isMe
                        ? 'bg-white text-gray-900 rounded-3xl rounded-br-sm'
                        : 'bg-[#0A0A0A] text-white rounded-3xl rounded-tl-sm'
                    } ${msg.isPending ? 'opacity-70' : ''} ${isEditing ? 'ring-2 ring-blue-400' : ''}`}>
                    {isDeleted ? (
                        <p className="flex items-center gap-1.5 text-gray-400">
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
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                        hasReacted
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
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

                {/* Metadata row */}
                <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                    {msg.editedAt && !isDeleted && (
                        <span className="text-[10px] text-gray-400 italic">edited</span>
                    )}
                    {(msg.contentType === 'SIGNAL_ENCRYPTED' || msg.isDecrypted) && (
                        <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">lock</span>
                            Secure
                        </span>
                    )}
                    {msg.isPending && (
                        <span className="material-symbols-outlined text-[12px] text-gray-300 animate-pulse">schedule</span>
                    )}
                    {/* READ RECEIPTS / AVATARS */}
                    {isMe && !isDeleted && !msg.isPending && (
                        <div className="flex -space-x-1.5 flex-row-reverse items-center justify-end select-none ml-1">
                            {(msg.receipts || []).length === 0 ? (
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                            ) : (
                                msg.receipts.map(receipt => {
                                    const displayName = receipt.user?.displayName || receipt.user?.username || 'User';
                                    const avatarUrl = receipt.user?.avatarUrl;

                                    return (
                                        <div
                                            key={receipt.userId}
                                            className="w-4 h-4 rounded-full overflow-hidden bg-gray-200 ring-1 ring-white shrink-0 flex items-center justify-center"
                                            title={`Seen by ${displayName}`}
                                        >
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
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

            {/* Three-dot reaction trigger — right side of bubble */}
            {!isDeleted && !msg.isPending && !isBlocked && (
                <div
                    ref={pickerRef}
                    className="flex items-center self-center relative z-30"
                >
                    {pickerOpen ? (
                        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2">
                            <ReactionPicker
                                onReact={(emoji) => { onReact(emoji); setPickerOpen(false); }}
                            />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setPickerOpen(prev => !prev)}
                        className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all text-gray-400 hover:text-gray-700 cursor-pointer"
                        title="React"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="19" cy="12" r="1.5" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
