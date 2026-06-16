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
        <div className="bg-[#BDE0D8] text-gray-900 font-body overflow-hidden h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
            <div className="bg-[#F8FAF9] w-full h-full max-w-[1600px] rounded-3xl md:rounded-[2.5rem] lg:rounded-[3.5rem] flex overflow-hidden shadow-2xl relative border border-white/20">
                <SideNavBar className="relative h-full" />

                <main className="flex flex-1 h-full overflow-hidden">
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
                <section className="flex-1 h-full flex flex-col bg-[#F1F4F3] overflow-hidden relative">
                    {!selectedConversationId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F8FAF9]">
                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">forum</span>
                            <h2 className="text-xl font-bold text-gray-900">Select a Conversation</h2>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm">Choose an active chat from the sidebar or start a new secure exchange.</p>
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
                                    <div className="bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold border border-gray-100/50 shadow-sm">
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
                </section>
            </main>
        </div>

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
