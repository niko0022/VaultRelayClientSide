import { useRef, useEffect, useState } from 'react';
import ConfirmationModal from '../Shared/ConfirmationModal';

export default function ActiveChatHeader({
    recipientName,
    recipientUser,
    isSessionReady,
    menuOpen,
    setMenuOpen,
    onDeleteConversation,
    onToggleMediaPanel,
    mediaPanelOpen
}) {
    const menuRef = useRef(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen, setMenuOpen]);

    return (
        <header className="h-20 px-8 flex items-center justify-between border-b border-gray-200 bg-white/60 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center">
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4 shadow-sm border border-gray-100">
                    {recipientUser?.avatarUrl ? (
                        <img
                            src={recipientUser.avatarUrl}
                            alt={recipientName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                    )}
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">{recipientName}</h1>
                    <div className="flex items-center text-xs mt-0.5 gap-1.5">
                        {recipientUser?.status === 'ONLINE' ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-gray-500">Online</span>
                            </>
                        ) : isSessionReady ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-gray-500 uppercase tracking-widest text-[10px] font-medium">End-to-End Encrypted</span>
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-amber-600 uppercase tracking-widest text-[10px] font-medium">Establishing Session...</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-3 text-gray-400">
                <button
                    onClick={onToggleMediaPanel}
                    className={`p-2 transition-colors rounded-full cursor-pointer ${
                        mediaPanelOpen ? 'text-gray-800 bg-gray-100' : 'hover:text-gray-800 hover:bg-gray-50'
                    }`}
                    title="View Photos and Files"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>

                {/* Action Menu Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-50 cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl z-50 py-1">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    setConfirmDeleteOpen(true);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3"
                            >
                                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                Delete Conversation
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={onDeleteConversation}
                title="Delete Conversation"
                message="Are you sure you want to permanently delete this entire conversation for everyone?"
                confirmText="Delete"
            />
        </header>
    );
}
