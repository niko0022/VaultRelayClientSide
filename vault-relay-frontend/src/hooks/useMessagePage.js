import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useConversations } from './useConversations';
import { useMessages } from './useMessages';
import { useMessageActions } from '../components/Messages/MessageContextMenu';
import { chatService } from '../services/chatService';
import { useToast } from '../contexts/ToastContext';
import { resolveConversationName } from '../utils/conversationUtils';

export function useMessagePage(user) {
    const { showToast } = useToast();
    const location = useLocation();

    // --- Conversation List State ---
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
            window.history.replaceState({}, '');
        }
    }, [location.state, convsLoading, conversations, selectConversation]);

    // --- Active Conversation Info ---
    const activeConv = conversations.find(c => c.id === selectedConversationId);
    let recipientId = null;
    let recipientName = 'Unknown User';
    let recipientUser = null;
    const isGroupChat = activeConv?.type === 'GROUP';

    if (activeConv && user) {
        recipientName = resolveConversationName(activeConv, user.id) || (isGroupChat ? 'Group Chat' : 'Unknown User');
        if (!isGroupChat) {
            const peer = activeConv.participantAId === user.id ? activeConv.participantB : activeConv.participantA;
            recipientUser = peer;
            recipientId = activeConv.participantAId === user.id ? activeConv.participantBId : activeConv.participantAId;
        }
    }

    // --- Message History State ---
    const {
        messages: rawMessages,
        loading: messagesLoading,
        error: messagesError,
        hasOlder,
        loadOlder,
        sendSecureMessage,
        editSecureMessage,
        deleteSecureMessage,
        setTypingStatus,
        typingUsers,
        isSessionReady,
        reactions,
        reactToMessage
    } = useMessages(activeConv, user?.id);

    const messages = rawMessages.map(msg => {
        const participant = activeConv?.participants?.find(p => p.userId === msg.senderId);
        const resolvedSender = participant?.user || msg.sender;
        const resolvedReceipts = (msg.receipts || []).map(receipt => {
            const receiptParticipant = activeConv?.participants?.find(p => p.userId === receipt.userId);
            return { ...receipt, user: receipt?.user || receiptParticipant?.user }
        })

        return { ...msg, sender: resolvedSender, receipts: resolvedReceipts };
    })

    // --- Typing Label ---
    const typingLabel = (() => {
        if (typingUsers.size === 0) return null;

        if (!isGroupChat) {
            // Direct chat: only one person can be typing, and we already have their name
            return typingUsers.has(recipientId) ? `${recipientName} is typing` : null;
        }

        // Group chat: look up names from the participant list on the conversation
        const participants = activeConv?.participants || [];
        const names = [...typingUsers]
            .map(uid => {
                const p = participants.find(p => p.userId === uid);
                return p?.user?.displayName || p?.user?.username;
            })
            .filter(Boolean);

        if (names.length === 0) return null;
        if (names.length === 1) return `${names[0]}`;
        if (names.length === 2) return `${names[0]}, ${names[1]}`;
        return `${names[0]}, ${names.length - 1}`;
    })();

    // --- Composer & UI State ---
    const [composerText, setComposerText] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const messagesEndRef = useRef(null);
    const prevLastMsgIdRef = useRef(null);

    // --- Message Context Actions ---
    const {
        editingMessage, setEditingMessage,
        contextMenu, handleContextMenu,
        handleEditClick: rawEditClick,
        handleDeleteClick, handleCloseMenu,
        cancelEdit,
    } = useMessageActions({ deleteSecureMessage, user });

    const handleEditClick = (msg) => {
        rawEditClick(msg);
        setComposerText(msg.content);
    };

    // Auto-scroll when new message arrives
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.id && lastMsg.id !== prevLastMsgIdRef.current) {
            prevLastMsgIdRef.current = lastMsg.id;
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // --- Handlers ---

    const handleTextChange = (e) => {
        setComposerText(e.target.value);
        if (!selectedConversationId) return;

        if (!isTypingRef.current) {
            setTypingStatus(true);
            isTypingRef.current = true;
        }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setTypingStatus(false);
            isTypingRef.current = false;
        }, 1500);
    };

    const handleSend = async () => {
        const file = selectedFile;
        if ((!composerText.trim() && !file) || !selectedConversationId || !isSessionReady) return;
        const text = composerText.trim();
        setComposerText('');
        setSelectedFile(null);
        setTypingStatus(false);

        try {
            if (editingMessage) {
                await editSecureMessage(editingMessage.id, text);
                setEditingMessage(null);
            } else {
                await sendSecureMessage(text, file);
            }
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape' && editingMessage) {
            cancelEdit();
            setComposerText('');
        }
    };

    const handleDeleteConversation = async () => {
        try {
            await chatService.deleteConversation(activeConv.id);
        } catch (err) {
            console.error("Failed to delete conversation", err);
            alert("Failed to delete conversation.");
        }
    };

    return {
        conversations, selectedConversationId, selectConversation, convsLoading,
        activeConv, recipientId, recipientName, recipientUser, isGroupChat,
        messages, messagesLoading, messagesError, hasOlder, loadOlder, typingUsers, typingLabel, isSessionReady,
        composerText, setComposerText, menuOpen, setMenuOpen, showGroupModal, setShowGroupModal, selectedFile, setSelectedFile,
        editingMessage, contextMenu, handleContextMenu, handleEditClick, handleDeleteClick, handleCloseMenu, cancelEdit,
        messagesEndRef,
        handleTextChange, handleSend, handleKeyDown, handleDeleteConversation,
        reactions, reactToMessage
    };
}
