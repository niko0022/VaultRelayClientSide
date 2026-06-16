export default function ContactDetailView({
    selectedFriend,
    handleStartMessage,
    handleBlockFriend,
    handleRemoveFriend
}) {
    return (
        <section className="hidden md:flex flex-1 bg-white flex-col relative overflow-hidden">
            {/* Subtle background accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-50 blur-[120px] -z-0 rounded-full pointer-events-none opacity-60"></div>

            {!selectedFriend ? (
                /* No friend selected — empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative z-10">
                    <div className="w-24 h-24 rounded-3xl bg-[#F1F4F3] flex items-center justify-center mb-6 shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-teal-300">contacts</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700">Select a Contact</h2>
                    <p className="text-sm text-gray-400 mt-2 max-w-xs">
                        Choose a friend from the list to view their profile and start a secure conversation.
                    </p>
                </div>
            ) : (
                /* Friend detail view */
                <div className="max-w-2xl w-full mx-auto p-10 flex flex-col items-center justify-center flex-1 h-full overflow-y-auto relative z-10">
                    <div className="flex flex-col items-center gap-10 w-full">

                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-[2rem] overflow-hidden ring-4 ring-teal-100 shadow-lg transition-transform duration-500 group-hover:scale-[1.02]">
                                {selectedFriend.user.avatarUrl ? (
                                    <img alt="" className="w-full h-full object-cover" src={selectedFriend.user.avatarUrl} />
                                ) : (
                                    <div className="w-full h-full bg-[#F1F4F3] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-6xl text-gray-300">person</span>
                                    </div>
                                )}
                            </div>
                            {/* Online indicator */}
                            {selectedFriend.user.status === 'ONLINE' && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full ring-4 ring-white animate-pulse shadow"></div>
                            )}
                        </div>

                        {/* Identity Info */}
                        <div className="space-y-6 text-center w-full">
                            {/* Name + badges */}
                            <div className="space-y-3">
                                <h2 className="font-headline text-4xl font-bold tracking-tight text-gray-800">
                                    {selectedFriend.user.displayName || selectedFriend.user.username}
                                </h2>
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <span className="bg-teal-50 text-teal-600 text-xs font-bold px-4 py-1.5 rounded-full border border-teal-100 uppercase tracking-[0.15em]">
                                        Secure Contact
                                    </span>
                                    {selectedFriend.user.status === 'ONLINE' ? (
                                        <span className="bg-green-50 text-green-600 text-xs font-bold px-4 py-1.5 rounded-full border border-green-100 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                                            Online
                                        </span>
                                    ) : (
                                        <span className="bg-gray-50 text-gray-400 text-xs font-bold px-4 py-1.5 rounded-full border border-gray-100 uppercase tracking-[0.15em]">
                                            Offline
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Friend code */}
                            {selectedFriend.user.friendCode && (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-teal-400 text-base">fingerprint</span>
                                    <p className="text-sm font-mono font-semibold text-gray-500 tracking-widest uppercase">
                                        {selectedFriend.user.friendCode}
                                    </p>
                                </div>
                            )}

                            {/* Friends since */}
                            {selectedFriend.since && (
                                <p className="text-sm text-gray-400">
                                    Friends since {new Date(selectedFriend.since).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 w-full max-w-sm">
                            <button
                                onClick={() => handleStartMessage(selectedFriend.user.id)}
                                className="w-full bg-teal-500 text-white px-10 py-4 rounded-xl font-bold uppercase tracking-[0.15em] text-sm hover:bg-teal-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer shadow-md shadow-teal-200"
                            >
                                <span className="material-symbols-outlined text-xl">forum</span>
                                Start Secure Message
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleBlockFriend}
                                    className="bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base text-gray-400 group-hover:text-gray-600 transition-colors">block</span>
                                    Block
                                </button>
                                <button
                                    onClick={handleRemoveFriend}
                                    className="bg-gray-50 border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] xl:text-xs transition-all flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-base text-gray-400 group-hover:text-rose-500 transition-colors">person_remove</span>
                                    Unfriend
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
