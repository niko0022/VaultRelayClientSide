import { formatTime } from '../../utils/timeFormat';
import AttachmentViewer from './AttachmentViewer';

export default function MessageBubble({ msg, isMe, isEditing, handleContextMenu }) {
    const isDeleted = msg.deleted;

    return (
        <div
            className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end self-end' : 'items-start'}`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
        >
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
            </div>
        </div>
    );
}
