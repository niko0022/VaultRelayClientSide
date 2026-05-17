export default function ContactListItem({ friend, isSelected, onSelect }) {
    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-xl cursor-pointer group transition-all duration-200 ${isSelected ? 'bg-primary-container/5 ring-1 ring-primary-container/20' : 'hover:bg-surface-container-low'}`}
        >
            <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest shrink-0">
                    {friend.user.avatarUrl ? (
                        <img
                            alt=""
                            className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                            src={friend.user.avatarUrl}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant text-2xl">person</span>
                        </div>
                    )}
                    {isSelected && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary-container rounded-full ring-2 ring-background"></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className={`font-headline text-sm truncate ${isSelected ? 'font-bold text-on-surface' : 'font-medium text-on-surface/80 group-hover:text-on-surface'} transition-colors`}>
                            {friend.user.displayName || friend.user.username}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="material-symbols-outlined text-on-surface-variant text-[14px]">shield</span>
                        <span className="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant">Secure Contact</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
