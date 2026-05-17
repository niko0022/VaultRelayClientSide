export default function ActiveChatHeader({
    recipientName,
    isSessionReady,
    isGroupChat,
    typingUsers,
    recipientId,
    menuOpen,
    setMenuOpen,
    onDeleteConversation
}) {
    return (
        <header className="h-16 w-full flex items-center justify-between px-6 bg-[#131313]/90 backdrop-blur-xl sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] shrink-0 border-b border-white/5">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <h2 className="font-headline text-lg font-bold text-primary tracking-tight leading-tight">{recipientName}</h2>
                    <div className="flex items-center gap-1.5">
                        {isSessionReady ? (
                            <>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]"></div>
                                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">End-to-End Encrypted</span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-error rounded-full animate-pulse"></div>
                                <span className="text-[10px] uppercase tracking-widest text-error font-bold whitespace-nowrap">Establishing Session...</span>
                            </>
                        )}
                        {isGroupChat ? (
                            typingUsers.size > 0 && (
                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold ml-2">
                                    {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people typing...`}
                                </span>
                            )
                        ) : (
                            typingUsers.has(recipientId) && (
                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold ml-2">Typing...</span>
                            )
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded cursor-pointer">
                    <span className="material-symbols-outlined">search</span>
                </button>
                
                {/* Action Menu Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded cursor-pointer">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-surface-container-high border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50 py-1">
                            <button 
                                onClick={() => {
                                    setMenuOpen(false);
                                    if (window.confirm("Are you sure you want to permanently delete this entire conversation for everyone?")) {
                                        onDeleteConversation();
                                    }
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                Delete Conversation
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
