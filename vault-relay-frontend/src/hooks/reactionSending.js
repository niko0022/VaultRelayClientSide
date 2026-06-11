import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

/**
 * Encrypts and sends an emoji reaction envelope.
 *
 * @param {string} emoji - The emoji to react with.
 * @param {object} targetMessage - The message being reacted to.
 * @param {boolean} isRemove - True to remove the reaction, false to add.
 * @param {object} deps - Required encryption and session references.
 */
export async function sendReaction(emoji, targetMessage, isRemove, {
    conversationId, isGroup, conversation, currentUserId,
    directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
    encryptGroupMessage, generateGroupDistributionMap, distributedRef,
}) {
    if (!conversationId) return;

    // 1. Build JSON reaction envelope
    const envelope = {
        type: 'REACTION',
        emoji,
        targetMessageId: targetMessage.id,
        targetAuthorId: targetMessage.senderId,
        targetSentTimestamp: targetMessage.createdAt,
        isRemove
    };

    const plaintextToEncrypt = JSON.stringify(envelope);
    let encryptedPayload;

    // 2. Encrypt reaction envelope
    if (isGroup) {
        if (!distributedRef.current) {
            const participantIds = (conversation.participants || []).map(p => p.userId);
            const mapBlob = await generateGroupDistributionMap(conversationId, participantIds);

            socketClient.emit('send_message', {
                conversationId,
                content: mapBlob,
                contentType: 'SIGNAL_KEY_DISTRIBUTION'
            }, () => { });

            distributedRef.current = true;
        }
        encryptedPayload = await encryptGroupMessage(conversationId, plaintextToEncrypt);
    } else {
        if (!directHasSession) {
            const bundle = await chatService.getPreKeyBundle(remoteDirectUserId);
            await directEstablish(bundle);
        }
        encryptedPayload = await directEncrypt(plaintextToEncrypt);
    }

    const payload = {
        conversationId,
        content: encryptedPayload,
        contentType: 'SIGNAL_REACTION'
    };

    // 3. Emit and handle acknowledgement
    return new Promise((resolve, reject) => {
        socketClient.emit('send_message', payload, async (ack) => {
            if (ack && !ack.success) {
                reject(new Error(ack.error || 'Failed to send reaction'));
            } else if (ack && ack.success) {
                try {
                    // Update local reactions database
                    if (isRemove) {
                        await signalStoreAdapter.removeReaction(targetMessage.id, currentUserId, emoji);
                    } else {
                        await signalStoreAdapter.saveReaction(targetMessage.id, conversationId, currentUserId, emoji);
                    }

                    // Cache this reaction message ID as processed so we don't double decrypt it
                    const cacheMsg = {
                        id: ack.message.id,
                        conversationId,
                        content: 'processed',
                        contentType: 'SIGNAL_REACTION',
                        createdAt: ack.message.createdAt,
                        senderId: currentUserId
                    };
                    await signalStoreAdapter.saveLocalMessage(cacheMsg);

                    resolve(ack.message);
                } catch (e) {
                    console.error('[Reaction] Failed to stash local reaction cache:', e);
                    resolve(ack.message);
                }
            } else {
                reject(new Error('No response from server'));
            }
        });
    });
}
