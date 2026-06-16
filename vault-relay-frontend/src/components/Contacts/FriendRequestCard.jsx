export default function FriendRequestCard({ req, onAccept, onDecline, isLoading }) {
    return (
        <div className="p-3.5 bg-white border border-teal-100 rounded-xl mb-2 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-teal-100">
                    {req.user.avatarUrl ? (
                        <img src={req.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-gray-400">person</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-800 truncate">
                        {req.user.displayName || req.user.username}
                    </h3>
                    <span className="text-[10px] text-gray-400">wants to connect</span>
                </div>
            </div>
            <div className="flex gap-2 mt-3">
                <button
                    onClick={onAccept}
                    disabled={isLoading}
                    className="flex-1 bg-teal-500 text-white text-xs font-bold py-2 rounded-lg uppercase tracking-wider hover:bg-teal-600 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                    Accept
                </button>
                <button
                    onClick={onDecline}
                    disabled={isLoading}
                    className="flex-1 bg-gray-100 text-gray-500 text-xs font-bold py-2 rounded-lg uppercase tracking-wider hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
                >
                    Decline
                </button>
            </div>
        </div>
    );
}
