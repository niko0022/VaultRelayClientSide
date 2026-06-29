/**
 * Resolves the display name for a conversation.
 * Returns string | undefined
 */
export function resolveConversationName(conv, currentUserId) {
    if (!conv) {
        throw new Error('Conversation object is required');
    }

    if (conv.type === 'GROUP') {
        return conv.title;
    }

    // Direct Chat
    const peer = conv.participantAId === currentUserId ? conv.participantB : conv.participantA;
    return peer?.displayName || peer?.username;
}
