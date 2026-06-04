export default function UserFriendCode({ friendCode, copied, onCopy }) {
    if (!friendCode) return null;

    return (
        <button
            onClick={onCopy}
            className="w-full flex items-center justify-between gap-2 bg-primary-container/10 border border-primary-container/20 rounded-lg px-4 py-2.5 group hover:border-primary-container/40 transition-all cursor-pointer"
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-sm">fingerprint</span>
                <span className="text-xs font-mono text-primary/80 truncate">{friendCode}</span>
            </div>
            <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">
                {copied ? 'check' : 'content_copy'}
            </span>
        </button>
    );
}
