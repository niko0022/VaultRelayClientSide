export default function ContactListItem({ friend, isSelected, onSelect }) {
    return (
        <div
            onClick={onSelect}
            className={`p-3 rounded-xl cursor-pointer group transition-all duration-200 ${
                isSelected
                    ? 'bg-white shadow-sm ring-1 ring-teal-200'
                    : 'hover:bg-white/60'
            }`}
        >
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-100 shrink-0">
                    {friend.user.avatarUrl ? (
                        <img
                            alt=""
                            className="w-full h-full object-cover transition-all duration-500"
                            src={friend.user.avatarUrl}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
                        </div>
                    )}
                    {friend.user.status === 'ONLINE' ? (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-[#F1F4F3] animate-pulse" title="Online"></div>
                    ) : null}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm truncate transition-colors ${
                        isSelected ? 'text-gray-800' : 'text-gray-600 group-hover:text-gray-800'
                    }`}>
                        {friend.user.displayName || friend.user.username}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-teal-400 text-[13px]">shield</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Secure Contact</span>
                    </div>
                </div>

                {/* Online badge */}
                {friend.user.status === 'ONLINE' && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                        Online
                    </span>
                )}
            </div>
        </div>
    );
}
