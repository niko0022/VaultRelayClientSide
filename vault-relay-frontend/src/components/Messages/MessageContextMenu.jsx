import { useState, useEffect, useCallback } from 'react';

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export default function MessageContextMenu({
    contextMenu,        // { x, y, messageId } or null
    messages,           // full messages array to find the target
    onEdit,             // (msg) => void — called when user clicks "Edit"
    onDelete,           // (msgId) => void — called when user clicks "Delete"
    onClose,            // () => void — called to dismiss the menu
}) {
    // Close on any outside click
    useEffect(() => {
        if (!contextMenu) return;
        const handleClick = () => onClose();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu, onClose]);

    if (!contextMenu) return null;

    const targetMsg = messages.find(m => m.id === contextMenu.messageId);
    if (!targetMsg) return null;

    const canEdit = Date.now() - new Date(targetMsg.createdAt).getTime() < EDIT_WINDOW_MS;

    return (
        <div
            className="fixed z-[100] bg-surface-container-high border border-white/10 rounded-lg overflow-hidden shadow-2xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            {canEdit && (
                <button
                    onClick={() => onEdit(targetMsg)}
                    className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit Message
                </button>
            )}
            <button
                onClick={() => onDelete(contextMenu.messageId)}
                className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
            >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Message
            </button>
        </div>
    );
}

/**
 * useMessageActions — Hook that manages edit/delete state and handlers.
 * Returns everything Messages.jsx needs to wire up the context menu and edit mode.
 */
export function useMessageActions({ deleteSecureMessage, user }) {
    const [editingMessage, setEditingMessage] = useState(null);   // { id, content }
    const [contextMenu, setContextMenu] = useState(null);         // { x, y, messageId }

    const handleContextMenu = useCallback((e, msg) => {
        if (msg.senderId !== user?.id || msg.deleted) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id });
    }, [user?.id]);

    const handleEditClick = useCallback((msg) => {
        setEditingMessage({ id: msg.id, content: msg.content });
        setContextMenu(null);
    }, []);

    const handleDeleteClick = useCallback(async (msgId) => {
        setContextMenu(null);
        if (window.confirm('Delete this message for everyone?')) {
            try {
                await deleteSecureMessage(msgId);
            } catch (err) {
                alert(err.message);
            }
        }
    }, [deleteSecureMessage]);

    const handleCloseMenu = useCallback(() => setContextMenu(null), []);

    const cancelEdit = useCallback(() => {
        setEditingMessage(null);
    }, []);

    return {
        editingMessage,
        setEditingMessage,
        contextMenu,
        handleContextMenu,
        handleEditClick,
        handleDeleteClick,
        handleCloseMenu,
        cancelEdit,
    };
}
