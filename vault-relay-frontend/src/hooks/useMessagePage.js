import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useConversations } from './useConversations';
import { useMessages } from './useMessages';
import { useMessageActions } from './useMessageActions';
import { chatService } from '../services/chatService';

export function useMessagePage(user) {
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
    const isGroupChat = activeConv?.type === 'GROUP';

    if (activeConv && user) {
        if (isGroupChat) {
            recipientName = activeConv.title || 'Group Chat';
        } else {
            const isUserA = activeConv.participantAId === user.id;
            const participant = isUserA ? activeConv.participantB : activeConv.participantA;
            recipientId = isUserA ? activeConv.participantBId : activeConv.participantAId;
            recipientName = participant?.displayName;
        }
    }

    // --- Message History State ---
    const {
        messages,
        loading: messagesLoading,
        error: messagesError,
        hasOlder,
        loadOlder,
        sendSecureMessage,
        editSecureMessage,
        deleteSecureMessage,
        setTypingStatus,
        typingUsers,
        isSessionReady
    } = useMessages(activeConv, user?.id);

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
        if ((!composerText.trim() && !selectedFile) || !selectedConversationId || !isSessionReady) return;
        const text = composerText.trim();
        const file = selectedFile;
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
            alert(err.message);
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
        activeConv, recipientId, recipientName, isGroupChat,
        messages, messagesLoading, messagesError, hasOlder, loadOlder, typingUsers, isSessionReady,
        composerText, setComposerText, menuOpen, setMenuOpen, showGroupModal, setShowGroupModal, selectedFile, setSelectedFile,
        editingMessage, contextMenu, handleContextMenu, handleEditClick, handleDeleteClick, handleCloseMenu, cancelEdit,
        messagesEndRef,
        handleTextChange, handleSend, handleKeyDown, handleDeleteConversation
    };
}
