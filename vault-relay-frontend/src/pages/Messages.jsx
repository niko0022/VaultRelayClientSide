import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SideNavBar from '../components/SideNavBar';
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';

// Helper to format timestamps
function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Messages() {
    const { user } = useAuth();
    const location = useLocation();

    // Conversation List State
    const {
        conversations,
        selectedConversationId,
        selectConversation,
        loading: convsLoading
    } = useConversations();

    // Auto-open a conversation if navigated from Contacts with state
    useEffect(() => {
        const openId = location.state?.openConversationId;
        if (openId && !convsLoading && conversations.length > 0) {
            selectConversation(openId);
            // Clear the state so a refresh doesn't re-trigger
            window.history.replaceState({}, '');
        }
    }, [location.state, convsLoading, conversations, selectConversation]);

    // Determine active conversation details
    const activeConv = conversations.find(c => c.id === selectedConversationId);

    // Determine active conversation display info
    let recipientId = null;
    let recipientName = 'Unknown User';
    const isGroupChat = activeConv?.type === 'GROUP';

    if (activeConv && user) {
        if (isGroupChat) {
            recipientName = activeConv.title || 'Group Chat';
        } else {
            if (activeConv.participantAId === user.id) {
                recipientId = activeConv.participantBId;
                recipientName = activeConv.participantB?.displayName || activeConv.participantB?.username || 'Unknown User';
            } else {
                recipientId = activeConv.participantAId;
                recipientName = activeConv.participantA?.displayName || activeConv.participantA?.username || 'Unknown User';
            }
        }
    }

    const {
        messages,
        loading: messagesLoading,
        error: messagesError,
        hasOlder,
        loadOlder,
        sendSecureMessage,
        setTypingStatus,
        typingUsers,
        isSessionReady
    } = useMessages(activeConv, user?.id);

    // Composer State
    const [composerText, setComposerText] = useState('');
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const messagesEndRef = useRef(null);
    const prevLastMsgIdRef = useRef(null);

    // Auto-scroll only when a genuinely new message arrives at the bottom
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        const lastId = lastMsg?.id;

        if (lastId && lastId !== prevLastMsgIdRef.current) {
            prevLastMsgIdRef.current = lastId;
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleTextChange = (e) => {
        setComposerText(e.target.value);
        if (selectedConversationId) {
            // Only emit typing:true on the false→true transition to avoid spamming the socket
            if (!isTypingRef.current) {
                setTypingStatus(true);
                isTypingRef.current = true;
            }
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setTypingStatus(false);
                isTypingRef.current = false;
            }, 1500);
        }
    };

    const handleSend = async () => {
        if (!composerText.trim() || !selectedConversationId || !isSessionReady) return;
        const text = composerText.trim();
        setComposerText('');
        setTypingStatus(false);
        await sendSecureMessage(text);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-background text-on-surface font-body overflow-hidden h-screen flex relative">
            <SideNavBar />

            <main className="flex flex-1 ml-72 h-screen overflow-hidden">
                {/* Secondary Pane: Conversation List */}
                <section className="w-80 h-full bg-surface-container-low flex flex-col kinetic-grid border-r border-outline-variant/10">
                    <div className="p-6">
                        <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Active Chats</h2>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                            <input
                                className="w-full bg-surface-container-lowest border-none text-sm py-2 pl-10 pr-4 focus:ring-0 focus:outline-none rounded text-on-surface placeholder:text-outline"
                                placeholder="Search chats..."
                                type="text"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide">
                        {convsLoading && <div className="p-4 text-center text-sm text-on-surface-variant">Loading chats...</div>}
                        {!convsLoading && conversations.length === 0 && (
                            <div className="p-4 text-center text-sm text-on-surface-variant">No active conversations.</div>
                        )}
                        {conversations.map(conv => {
                            const isSelected = selectedConversationId === conv.id;
                            const isUnread = conv.unreadCount > 0;
                            // Resolve display name for list preview
                            let peerName;
                            if (conv.type === 'GROUP') {
                                peerName = conv.title || 'Group Chat';
                            } else {
                                peerName = conv.participantAId === user?.id
                                    ? (conv.participantB?.displayName || conv.participantB?.username)
                                    : (conv.participantA?.displayName || conv.participantA?.username);
                            }

                            // Determine preview text
                            let previewText = "No messages yet.";
                            const lastMsg = conv.lastMessage;
                            if (lastMsg) {
                                if (lastMsg.contentType === 'SIGNAL_ENCRYPTED') {
                                    previewText = 'message';
                                } else {
                                    previewText = lastMsg.content;
                                }
                            }

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => selectConversation(conv.id)}
                                    className={`p-3 rounded-lg cursor-pointer flex gap-3 transition-colors relative ${isSelected ? 'bg-surface-container-high' : 'hover:bg-surface-container-high/50'}`}
                                >
                                    {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r"></div>}

                                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 relative">
                                        <span className="material-symbols-outlined text-on-surface-variant">person</span>
                                        {isUnread && (
                                            <div className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-primary rounded-full border-2 border-surface-container-low"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className={`font-headline text-sm truncate ${isUnread || isSelected ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                                                {peerName || 'Unknown User'}
                                            </h3>
                                            {lastMsg && (
                                                <span className="text-[10px] text-on-surface-variant whitespace-nowrap ml-2">
                                                    {formatTime(lastMsg.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs truncate ${isUnread ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                                            {previewText}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

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
                                    <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded cursor-pointer">
                                        <span className="material-symbols-outlined">more_vert</span>
                                    </button>
                                </div>
                            </header>

                            {/* Message History */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 flex flex-col scrollbar-hide">
                                {hasOlder && (
                                    <button onClick={loadOlder} className="self-center text-xs text-primary hover:underline py-2">
                                        Load older messages
                                    </button>
                                )}

                                <div className="flex justify-center my-4">
                                    <div className="bg-surface-container-low px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium border border-white/5">
                                        Communication Tunnel Established
                                    </div>
                                </div>

                                {messages.map(msg => {
                                    const isMe = msg.senderId === user?.id;

                                    return (
                                        <div key={msg.id} className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end self-end' : 'items-start'}`}>
                                            <div className={`p-3.5 shadow-sm text-[15px] leading-relaxed break-words ${isMe
                                                ? 'bg-secondary-container text-on-secondary-container rounded-tl-xl rounded-bl-xl rounded-br-xl'
                                                : 'bg-surface-container-high text-on-surface rounded-tr-xl rounded-br-xl rounded-bl-xl border-l-[3px] border-primary/40'
                                                } ${msg.isPending ? 'opacity-70' : ''}`}>
                                                <p>{msg.content}</p>
                                            </div>
                                            <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[10px] text-on-surface-variant/60">{formatTime(msg.createdAt)}</span>
                                                {msg.contentType === 'SIGNAL_ENCRYPTED' && (
                                                    <span className="text-[10px] text-primary/70 uppercase font-bold tracking-wider flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[10px]">lock</span>
                                                        Secure
                                                    </span>
                                                )}
                                                {msg.isPending && (
                                                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50 animate-pulse">schedule</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Secure Input Field */}
                            <div className="p-4 md:p-6 bg-[#131313]/90 backdrop-blur-xl shrink-0 border-t border-white/5">
                                <div className="max-w-4xl mx-auto flex items-end gap-3 md:gap-4">
                                    <div className="flex-1 bg-surface-container-lowest rounded-xl flex flex-col p-1 transition-all border border-surface-container-highest focus-within:border-primary/50 focus-within:shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                                        <textarea
                                            value={composerText}
                                            onChange={handleTextChange}
                                            onKeyDown={handleKeyDown}
                                            disabled={!isSessionReady}
                                            className="w-full bg-transparent border-none text-on-surface text-[15px] py-3 px-4 focus:ring-0 focus:outline-none resize-none max-h-48 scrollbar-hide placeholder:text-on-surface-variant/50 disabled:opacity-50"
                                            placeholder={isSessionReady ? "Type an encrypted message..." : "Waiting for secure connection..."}
                                            rows="1"
                                            style={{ minHeight: '44px' }}
                                        ></textarea>
                                        <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
                                            <div className="flex gap-0.5">
                                                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-white/5">
                                                    <span className="material-symbols-outlined text-xl">attach_file</span>
                                                </button>
                                                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-white/5 hidden sm:block">
                                                    <span className="material-symbols-outlined text-xl">mood</span>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                                <button
                                                    onClick={handleSend}
                                                    disabled={!composerText.trim() || !isSessionReady}
                                                    className="p-1.5 md:p-2 text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>

            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-20 z-[60] pointer-events-none"></div>
        </div>
    );
}
