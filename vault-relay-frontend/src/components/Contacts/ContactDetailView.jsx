export default function ContactDetailView({
    selectedFriend,
    handleStartMessage,
    handleBlockFriend,
    handleRemoveFriend
}) {
    return (
        <section className="hidden md:flex flex-1 bg-surface-container-lowest flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-container/10 blur-[150px] -z-10 rounded-full pointer-events-none"></div>

            {!selectedFriend ? (
                /* No friend selected */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4">contacts</span>
                    <h2 className="text-xl font-headline text-on-surface">Select a Contact</h2>
                    <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
                        Choose a friend from the list to view their profile and start a secure conversation.
                    </p>
                </div>
            ) : (
                /* Friend detail view */
                <div className="max-w-5xl w-full mx-auto p-16 flex flex-col items-center justify-center flex-1 h-full overflow-y-auto">
                    <div className="flex flex-col items-center gap-12 w-full mt-auto mb-auto">

                        {/* Avatar */}
                        <div className="relative group mx-auto">
                            <div className="w-64 h-64 rounded-[2rem] overflow-hidden ring-4 ring-primary-container/20 shadow-[0_0_50px_rgba(0,229,255,0.1)] transition-transform duration-500 group-hover:scale-[1.02]">
                                {selectedFriend.user.avatarUrl ? (
                                    <img alt="" className="w-full h-full object-cover" src={selectedFriend.user.avatarUrl} />
                                ) : (
                                    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                                        <span className="material-symbols-outlined text-8xl text-on-surface-variant/40">person</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Identity Info */}
                        <div className="flex-1 space-y-10 text-center w-full max-w-2xl mx-auto">
                            <div className="space-y-4">
                                <div className="flex flex-col items-center gap-4">
                                    <h2 className="font-headline text-5xl lg:text-7xl font-bold tracking-tighter text-on-background">
                                        {selectedFriend.user.displayName || selectedFriend.user.username}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary-container/10 text-primary-container text-xs font-bold px-4 py-1.5 rounded-full border border-primary-container/20 uppercase tracking-[0.2em]">
                                            Secure Contact
                                        </span>
                                        {selectedFriend.user.status === 'ONLINE' ? (
                                            <span className="bg-green-500/10 text-green-400 text-xs font-bold px-4 py-1.5 rounded-full border border-green-500/20 uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                                                Online
                                            </span>
                                        ) : (
                                            <span className="bg-surface-container-highest/50 text-on-surface-variant/50 text-xs font-bold px-4 py-1.5 rounded-full border border-white/5 uppercase tracking-[0.2em]">
                                                Offline
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {selectedFriend.user.friendCode && (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <span className="material-symbols-outlined text-primary-container/50 text-base">fingerprint</span>
                                        <p className="text-base lg:text-lg font-mono font-bold text-primary-container/80 tracking-widest uppercase">
                                            {selectedFriend.user.friendCode}
                                        </p>
                                    </div>
                                )}
                                {selectedFriend.since && (
                                    <p className="text-sm text-on-surface-variant">
                                        Friends since {new Date(selectedFriend.since).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-6 w-full max-w-md mx-auto pt-4">
                                <button
                                    onClick={() => handleStartMessage(selectedFriend.user.id)}
                                    className="w-full bg-primary-container text-on-primary-container px-12 py-6 rounded-xl font-headline font-bold uppercase tracking-[0.2em] text-sm lg:text-base hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-2xl">forum</span>
                                    Start Secure Message
                                </button>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleBlockFriend}
                                        className="bg-surface-container-highest/20 border border-outline-variant/20 text-on-surface/50 hover:text-on-surface hover:border-outline-variant/60 hover:bg-surface-container-highest/40 px-6 py-4 rounded-xl font-headline font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-lg opacity-50 group-hover:opacity-100 transition-opacity">block</span>
                                        Block Contact
                                    </button>
                                    <button
                                        onClick={handleRemoveFriend}
                                        className="bg-surface-container-highest/20 border border-outline-variant/20 text-on-surface/50 hover:text-error hover:border-error/40 hover:bg-error/5 px-6 py-4 rounded-xl font-headline font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-lg opacity-50 group-hover:opacity-100 transition-opacity">person_remove</span>
                                        Unfriend
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
