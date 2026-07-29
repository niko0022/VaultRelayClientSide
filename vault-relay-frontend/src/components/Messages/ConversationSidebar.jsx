import { useState, useEffect } from 'react';
import ConversationListItem from './ConversationListItem';
import { resolveConversationName } from '../../utils/conversationUtils';
import { useChatLock } from '../../hooks/useChatLock';
import PasscodeModal from '../Shared/PasscodeModal';

export default function ConversationSidebar({
    setShowGroupModal,
    convsLoading,
    conversations,
    user,
    selectedConversationId,
    selectConversation
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const { 
        isLocked, 
        hasFolderPasscode, 
        setFolderPasscode, 
        verifyFolderPasscode, 
        lockFolder, 
        isFolderUnlocked 
    } = useChatLock();

    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const [passcodeMode, setPasscodeMode] = useState('verify');
    const [isLockedSectionExpanded, setIsLockedSectionExpanded] = useState(false);
    const [passcodeError, setPasscodeError] = useState('');

    // Keep sidebar expansion in sync with folder lock state
    useEffect(() => {
        if (!isFolderUnlocked) setIsLockedSectionExpanded(false);
    }, [isFolderUnlocked]);

    const filteredConversations = conversations.filter(conv => {
        const displayName = resolveConversationName(conv, user?.id) || (conv.type === 'GROUP' ? 'Group Chat' : 'Unknown User');
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const standardConvs = filteredConversations.filter(c => !isLocked(c.id));
    const lockedConvs = filteredConversations.filter(c => isLocked(c.id));
    const hasAnyLockedChats = conversations.some(c => isLocked(c.id));

    const handleFolderClick = async () => {
        if (isFolderUnlocked) {
            setIsLockedSectionExpanded(!isLockedSectionExpanded);
            return;
        }

        const exists = await hasFolderPasscode();
        if (exists) {
            setPasscodeMode('verify');
        } else {
            setPasscodeMode('set');
        }
        setPasscodeError('');
        setIsPasscodeModalOpen(true);
    };

    const handlePasscodeSubmit = async (passcode) => {
        setPasscodeError('');
        if (passcodeMode === 'set') {
            await setFolderPasscode(passcode);
            setIsPasscodeModalOpen(false);
            setIsLockedSectionExpanded(true);
        } else {
            const ok = await verifyFolderPasscode(passcode);
            if (ok) {
                setIsPasscodeModalOpen(false);
                setIsLockedSectionExpanded(true);
            } else {
                setPasscodeError('Incorrect passcode.');
            }
        }
    };

    return (
        <section className="w-80 lg:w-96 flex-shrink-0 bg-white rounded-2xl flex flex-col overflow-hidden shadow-xl shadow-black/10">
            {/* Search Bar */}
            <div className="mb-4 mt-6 relative px-6">
                <div className="absolute inset-y-0 left-7 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </div>
                <input
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 text-sm outline-none placeholder-gray-400 transition-all"
                    placeholder="Search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                )}
            </div>

            <div className="pb-3 flex justify-between items-center px-6">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Messages</h2>
                <button
                    onClick={() => setShowGroupModal(true)}
                    className="p-2 text-gray-400 hover:text-gray-800 transition-colors hover:bg-gray-50 rounded-full cursor-pointer"
                    title="New Group Chat"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto pb-6 px-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {convsLoading && <div className="p-4 text-center text-sm text-gray-400">Loading chats...</div>}
                
                {/* Locked Chats Section */}
                {hasAnyLockedChats && !convsLoading && (
                    <div className="mb-2">
                        <div className="flex items-center justify-between px-3 py-2 rounded-2xl hover:bg-gray-50 transition-colors">
                            <div 
                                onClick={handleFolderClick}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-gray-900 text-lg">
                                        {isFolderUnlocked ? 'lock_open' : 'lock'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900">Locked Chats</h4>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {isFolderUnlocked ? 'Tap to collapse' : 'Tap to unlock'}
                                    </p>
                                </div>
                                {lockedConvs.length > 0 && (
                                    <div className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-2">
                                        {lockedConvs.length}
                                    </div>
                                )}
                            </div>
                            
                            {isFolderUnlocked && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        lockFolder();
                                        setIsLockedSectionExpanded(false);
                                    }}
                                    className="p-1.5 hover:bg-gray-200/60 rounded-xl text-gray-500 hover:text-gray-950 transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
                                    title="Lock Folder"
                                >
                                    <span className="material-symbols-outlined text-base">lock</span>
                                </button>
                            )}
                        </div>

                        {/* Expanded Locked Chats List */}
                        {isFolderUnlocked && isLockedSectionExpanded && (
                            <div className="mt-2 pl-4 border-l border-gray-100 space-y-1">
                                {lockedConvs.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-gray-400">No matching locked chats.</div>
                                ) : (
                                    lockedConvs.map(conv => (
                                        <ConversationListItem
                                            key={conv.id}
                                            conv={conv}
                                            user={user}
                                            isSelected={selectedConversationId === conv.id}
                                            selectConversation={selectConversation}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                        <div className="h-px bg-gray-100 my-3 mx-3" />
                    </div>
                )}

                {/* Standard Conversations */}
                {!convsLoading && conversations.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-400">No active conversations.</div>
                )}
                {!convsLoading && conversations.length > 0 && standardConvs.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-400">
                        No conversations match "{searchQuery}"
                    </div>
                )}
                {standardConvs.map(conv => (
                    <ConversationListItem
                        key={conv.id}
                        conv={conv}
                        user={user}
                        isSelected={selectedConversationId === conv.id}
                        selectConversation={selectConversation}
                    />
                ))}
            </div>

            {/* Folder Passcode Modal */}
            <PasscodeModal
                isOpen={isPasscodeModalOpen}
                mode={passcodeMode}
                onClose={() => setIsPasscodeModalOpen(false)}
                onSubmit={handlePasscodeSubmit}
                errorMsg={passcodeError}
                title={passcodeMode === 'set' ? 'Set Locked Chats Passcode' : 'Unlock Locked Chats'}
            />
        </section>
    );
}
