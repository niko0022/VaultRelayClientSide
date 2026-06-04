export default function FriendRequestCard({ req, onAccept, onDecline, isLoading }) {
    return (
        <div className="p-3 bg-primary-container/5 ring-1 ring-primary-container/20 rounded-xl mb-1.5">
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
                    onClick={onAccept}
                    disabled={isLoading}
                    className="flex-1 bg-primary-container text-on-primary-container text-xs font-bold py-2 rounded-lg uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                    Accept
                </button>
                <button
                    onClick={onDecline}
                    disabled={isLoading}
                    className="flex-1 bg-surface-container-highest/30 text-on-surface-variant text-xs font-bold py-2 rounded-lg uppercase tracking-wider hover:text-error hover:bg-error/10 transition-all cursor-pointer disabled:opacity-50"
                >
                    Decline
                </button>
            </div>
        </div>
    );
}
