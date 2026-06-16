export default function BlockedUserListItem({ blocked, onUnblock }) {
    return (
        <div className="p-3 rounded-xl flex items-center gap-3 group hover:bg-white/60 transition-all">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 opacity-50 overflow-hidden">
                {blocked.user.avatarUrl ? (
                    <img src={blocked.user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full grayscale" />
                ) : (
                    <span className="material-symbols-outlined text-gray-400">person</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm text-gray-400 truncate">
                    {blocked.user.displayName || blocked.user.username}
                </h3>
            </div>
            <button
                onClick={onUnblock}
                className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-teal-500 bg-gray-100 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
                Unblock
            </button>
        </div>
    );
}
