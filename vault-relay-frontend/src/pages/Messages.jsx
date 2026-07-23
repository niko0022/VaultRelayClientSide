import { useState, useEffect } from 'react';
import SideNavBar from '../components/Shared/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useMessagePage } from '../hooks/useMessagePage';
import { useChatLock } from '../hooks/useChatLock';

// Components
import CreateGroupModal from '../components/Messages/CreateGroupModal';
import MessageContextMenu from '../components/Messages/MessageContextMenu';
import MessageBubble from '../components/Messages/MessageBubble';
import ConversationSidebar from '../components/Messages/ConversationSidebar';
import ActiveChatHeader from '../components/Messages/ActiveChatHeader';
import MessageComposer from '../components/Messages/MessageComposer';
import MediaGalleryPanel from '../components/Messages/MediaGalleryPanel';

export default function Messages() {
    const { user } = useAuth();
    const [mediaPanelOpen, setMediaPanelOpen] = useState(false);

    const {
        conversations, selectedConversationId, selectConversation, convsLoading,
        activeConv, recipientName, recipientUser,
        messages, messagesLoading, messagesError, hasOlder, loadOlder, isSessionReady,
        composerText, setComposerText, menuOpen, setMenuOpen, showGroupModal, setShowGroupModal, selectedFile, setSelectedFile,
        editingMessage, contextMenu, handleContextMenu, handleEditClick, handleDeleteClick, handleCloseMenu, cancelEdit, DeleteConfirmModal,
        messagesEndRef,
        handleTextChange, handleSend, handleKeyDown, handleDeleteConversation, typingLabel,
        reactions, reactToMessage
    } = useMessagePage(user);

    // Chat lock state and hook
    const { isLocked, isUnlocked, temporarilyUnlockChat } = useChatLock();
    const [localPasscode, setLocalPasscode] = useState('');
    const [localUnlockError, setLocalUnlockError] = useState('');

    const isChatLocked = selectedConversationId && isLocked(selectedConversationId) && !isUnlocked(selectedConversationId);

    // Close media panel and clear passcode input when conversation changes
    useEffect(() => {
        setMediaPanelOpen(false);
        setLocalPasscode('');
        setLocalUnlockError('');
    }, [selectedConversationId]);

    const handleLocalUnlockSubmit = async (e) => {
        e.preventDefault();
        setLocalUnlockError('');
        const ok = await temporarilyUnlockChat(selectedConversationId, localPasscode);
        if (ok) {
            setLocalPasscode('');
        } else {
            setLocalUnlockError('Incorrect passcode.');
        }
    };

    return (
        <div
            className="text-gray-900 font-body overflow-hidden h-screen flex p-4 gap-3"
            style={{ background: 'linear-gradient(135deg, #d4f0ee 0%, #e8f5e8 25%, #f0ece0 50%, #f5e8dc 75%, #eddee8 100%)' }}
        >
            {/* Left: Nav rail + Conversation list — both sit on the gradient */}
            <div className="flex h-full flex-shrink-0">
                <SideNavBar />
                <ConversationSidebar
                    setShowGroupModal={setShowGroupModal}
                    convsLoading={convsLoading}
                    conversations={conversations}
                    user={user}
                    selectedConversationId={selectedConversationId}
                    selectConversation={selectConversation}
                />
            </div>

            {/* Right: Active Chat — white floating card with rounded corners */}
            <section className="flex-1 h-full flex bg-white rounded-2xl overflow-hidden shadow-xl shadow-black/10 relative">
                {!selectedConversationId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">forum</span>
                        <h2 className="text-xl font-bold text-gray-900">Select a Conversation</h2>
                        <p className="text-sm text-gray-500 mt-2 max-w-sm">Choose an active chat from the sidebar or start a new secure exchange.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 h-full flex flex-col min-w-0 relative">
                            {/* TopAppBar */}
                            <ActiveChatHeader
                                conversationId={selectedConversationId}
                                recipientName={recipientName}
                                recipientUser={recipientUser}
                                isSessionReady={isSessionReady}
                                menuOpen={menuOpen}
                                setMenuOpen={setMenuOpen}
                                onDeleteConversation={handleDeleteConversation}
                                onToggleMediaPanel={() => setMediaPanelOpen(!mediaPanelOpen)}
                                mediaPanelOpen={mediaPanelOpen}
                            />

                            {isChatLocked ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/30">
                                    <div className="w-16 h-16 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mb-6 shadow-sm">
                                        <span className="material-symbols-outlined text-gray-900 text-2xl">lock</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Locked Conversation</h3>
                                    <p className="text-xs text-gray-500 mb-6 text-center max-w-xs leading-relaxed">
                                        This conversation is protected. Enter the Locked Chats passcode to decrypt and read messages.
                                    </p>

                                    {localUnlockError && (
                                        <div className="flex items-center gap-2.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl mb-4 text-left max-w-xs">
                                            <p className="text-[11px] text-red-600 font-medium leading-normal">{localUnlockError}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleLocalUnlockSubmit} className="flex flex-col items-center gap-4 w-full max-w-xs">
                                        <input
                                            type="password"
                                            placeholder="Passcode"
                                            value={localPasscode}
                                            onChange={(e) => setLocalPasscode(e.target.value)}
                                            className="w-full bg-black/5 border border-gray-200 rounded-2xl py-3 px-5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all text-center tracking-widest"
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            className="w-full py-3 bg-black text-white text-xs font-semibold rounded-2xl hover:bg-gray-900 transition-colors shadow-md active:scale-95 cursor-pointer"
                                        >
                                            Unlock Chat
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <>
                                    {/* Message History */}
                                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 flex flex-col scrollbar-hide">
                                        {messagesError && (
                                            <div className="bg-error/10 text-error text-xs px-4 py-2 rounded-lg text-center mx-auto max-w-md">
                                                Failed to load messages: {messagesError}
                                            </div>
                                        )}
                                        {messagesLoading && (
                                            <div className="flex justify-center py-4">
                                                <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                                            </div>
                                        )}
                                        {hasOlder && !messagesLoading && (
                                            <button onClick={loadOlder} className="self-center text-xs text-primary hover:underline py-2">
                                                Load older messages
                                            </button>
                                        )}

                                        <div className="flex justify-center my-4">
                                            <div className="bg-gray-50 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold border border-gray-100 shadow-sm">
                                                Communication Tunnel Established
                                            </div>
                                        </div>

                                        {messages.map(msg => (
                                            <MessageBubble
                                                key={msg.id}
                                                msg={msg}
                                                isMe={msg.senderId === user?.id}
                                                isEditing={editingMessage?.id === msg.id}
                                                handleContextMenu={handleContextMenu}
                                                reactions={reactions[msg.id] || []}
                                                onReact={(emoji) => reactToMessage(msg.id, emoji)}
                                                currentUserId={user?.id}
                                                isBlocked={activeConv?.isBlocked}
                                            />
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Typing Indicator */}
                                    <div className={`px-6 pb-1 h-7 flex items-center transition-all duration-300 ${typingLabel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        {typingLabel && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-0.5">
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-xs text-on-surface-variant italic">{typingLabel}...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Secure Input Field */}
                                    <MessageComposer
                                        editingMessage={editingMessage}
                                        selectedFile={selectedFile}
                                        setSelectedFile={setSelectedFile}
                                        composerText={composerText}
                                        isSessionReady={isSessionReady}
                                        cancelEdit={cancelEdit}
                                        setComposerText={setComposerText}
                                        handleTextChange={handleTextChange}
                                        handleKeyDown={handleKeyDown}
                                        handleSend={handleSend}
                                        isBlocked={activeConv?.isBlocked}
                                        blockedById={activeConv?.blockedById}
                                        currentUserId={user?.id}
                                    />
                                </>
                            )}
                        </div>

                        {mediaPanelOpen && !isChatLocked && (
                            <MediaGalleryPanel
                                conversationId={selectedConversationId}
                                onClose={() => setMediaPanelOpen(false)}
                            />
                        )}
                    </>
                )}
            </section>

            {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} />}

            <MessageContextMenu
                contextMenu={contextMenu}
                messages={messages}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onClose={handleCloseMenu}
            />

            <DeleteConfirmModal />
        </div>
    );
}

