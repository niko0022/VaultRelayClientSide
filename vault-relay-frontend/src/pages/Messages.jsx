import SideNavBar from '../components/Shared/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useMessagePage } from '../hooks/useMessagePage';

// Components
import CreateGroupModal from '../components/Messages/CreateGroupModal';
import MessageContextMenu from '../components/Messages/MessageContextMenu';
import MessageBubble from '../components/Messages/MessageBubble';
import ConversationSidebar from '../components/Messages/ConversationSidebar';
import ActiveChatHeader from '../components/Messages/ActiveChatHeader';
import MessageComposer from '../components/Messages/MessageComposer';

export default function Messages() {
    const { user } = useAuth();

    const {
        conversations, selectedConversationId, selectConversation, convsLoading,
        activeConv, recipientName, recipientUser,
        messages, messagesLoading, messagesError, hasOlder, loadOlder, isSessionReady,
        composerText, setComposerText, menuOpen, setMenuOpen, showGroupModal, setShowGroupModal, selectedFile, setSelectedFile,
        editingMessage, contextMenu, handleContextMenu, handleEditClick, handleDeleteClick, handleCloseMenu, cancelEdit,
        messagesEndRef,
        handleTextChange, handleSend, handleKeyDown, handleDeleteConversation, typingLabel,
        reactions, reactToMessage
    } = useMessagePage(user);


    return (
        <div className="bg-background text-on-surface font-body overflow-hidden h-screen flex relative">
            <SideNavBar />

            <main className="flex flex-1 ml-72 h-screen overflow-hidden">
                {/* Secondary Pane: Conversation List */}
                <ConversationSidebar
                    setShowGroupModal={setShowGroupModal}
                    convsLoading={convsLoading}
                    conversations={conversations}
                    user={user}
                    selectedConversationId={selectedConversationId}
                    selectConversation={selectConversation}
                />

                {/* Main Area: Active Chat */}
                <section className="flex-1 h-full flex flex-col bg-surface overflow-hidden relative">
                    {!selectedConversationId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container-lowest/30">
                            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">forum</span>
                            <h2 className="text-xl font-headline text-on-surface">Select a Conversation</h2>
                            <p className="text-sm text-on-surface-variant mt-2 max-w-sm">Choose an active chat from the sidebar or start a new secure exchange.</p>
                        </div>
                    ) : (
                        <>
                            {/* TopAppBar */}
                            <ActiveChatHeader
                                recipientName={recipientName}
                                recipientUser={recipientUser}
                                isSessionReady={isSessionReady}
                                menuOpen={menuOpen}
                                setMenuOpen={setMenuOpen}
                                onDeleteConversation={handleDeleteConversation}
                            />

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
                                    <div className="bg-surface-container-low px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium border border-white/5">
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
                </section>
            </main>

            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-20 z-[60] pointer-events-none"></div>

            {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} />}

            <MessageContextMenu
                contextMenu={contextMenu}
                messages={messages}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onClose={handleCloseMenu}
            />
        </div>
    );
}
