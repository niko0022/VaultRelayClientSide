export default function BlockedUserListItem({ blocked, onUnblock }) {
    return (
        <div className="p-3 rounded-xl flex items-center gap-3 group">
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
                onClick={onUnblock}
                className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/40 hover:text-primary px-2 py-1 rounded transition-colors cursor-pointer"
            >
                Unblock
            </button>
        </div>
    );
}
