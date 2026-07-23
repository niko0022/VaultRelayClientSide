import { useState, useEffect, useCallback } from 'react';
import ConfirmationModal from '../Shared/ConfirmationModal';

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
            className="fixed z-[100] bg-white border border-gray-150 rounded-2xl shadow-xl py-2 min-w-[170px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            {canEdit && (
                <button
                    onClick={() => onEdit(targetMsg)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3"
                >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit Message
                </button>
            )}
            <button
                onClick={() => onDelete(contextMenu.messageId)}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer flex items-center gap-3"
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
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const handleContextMenu = useCallback((e, msg) => {
        if (msg.senderId !== user?.id || msg.deleted) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id });
    }, [user?.id]);

    const handleEditClick = useCallback((msg) => {
        setEditingMessage({ id: msg.id, content: msg.content });
        setContextMenu(null);
    }, []);

    const handleDeleteClick = useCallback((msgId) => {
        setContextMenu(null);
        setDeleteTargetId(msgId);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deleteTargetId) return;
        try {
            await deleteSecureMessage(deleteTargetId);
        } catch (err) {
            console.error('Delete message error:', err);
        } finally {
            setDeleteTargetId(null);
        }
    }, [deleteTargetId, deleteSecureMessage]);

    const cancelDelete = useCallback(() => {
        setDeleteTargetId(null);
    }, []);

    const handleCloseMenu = useCallback(() => setContextMenu(null), []);

    const cancelEdit = useCallback(() => {
        setEditingMessage(null);
    }, []);

    // Helper component to render inside Messages.jsx
    const DeleteConfirmModal = useCallback(() => (
        <ConfirmationModal
            isOpen={Boolean(deleteTargetId)}
            onClose={cancelDelete}
            onConfirm={confirmDelete}
            title="Delete Message"
            message="Are you sure you want to delete this message for everyone?"
            confirmText="Delete"
        />
    ), [deleteTargetId, cancelDelete, confirmDelete]);

    return {
        editingMessage,
        setEditingMessage,
        contextMenu,
        handleContextMenu,
        handleEditClick,
        handleDeleteClick,
        handleCloseMenu,
        cancelEdit,
        DeleteConfirmModal,
    };
}
