import { chatService } from '../services/chatService';
import { socketClient } from '../services/socketClient';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { encryptAttachment } from '../lib/crypto/attachmentCrypto';

/**
 * Encrypts and sends a message (with optional file attachment) via Signal protocol.
 *
 * Flow for attachments:
 * 1. Encrypt the file locally with AES-256-GCM
 * 2. Upload the encrypted blob to S3
 * 3. Bundle the AES key + file metadata into a JSON string
 * 4. Signal-encrypt the JSON string
 * 5. Emit via socket
 *
 * @param {string} plaintext - The text message.
 * @param {File|null} attachment - Optional file to attach.
 * @param {object} deps - All required dependencies.
 */
export async function sendSecureMessage(plaintext, attachment, {
    conversationId, isGroup, conversation, currentUserId,
    directHasSession, directEncrypt, directEstablish, remoteDirectUserId,
    encryptGroupMessage, generateGroupDistributionMap, distributedRef,
    setMessages, setError,
}) {
    if (!conversationId) return;
    try {
        let attachmentUrl = null;
        let plaintextToEncrypt = plaintext;

        // If an attachment is provided, encrypt it and upload to S3
        if (attachment) {
            const { encryptedBlob, keyBase64, ivBase64 } = await encryptAttachment(attachment);

            // Get presigned upload URL from backend
            const { uploadUrl, publicUrl } = await chatService.getAttachmentUploadUrl(conversationId);

            // Upload encrypted blob directly to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: encryptedBlob,
                headers: { 'Content-Type': 'application/octet-stream' },
            });

            attachmentUrl = publicUrl;

            // Package the AES key + file metadata into the plaintext that Signal will encrypt
            plaintextToEncrypt = JSON.stringify({
                text: plaintext || '',
                aesKey: keyBase64,
                iv: ivBase64,
                fileName: attachment.name || 'file',
                mimeType: attachment.type || 'application/octet-stream',
                fileSize: attachment.size || 0,
            });
        }

        let encryptedPayload;

        if (isGroup) {
            // If we haven't distributed our key for this group yet in this session, do it now.
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

        // Optimistic UI
        const tempId = `temp-${crypto.randomUUID()}`;
        const optimisticMsg = {
            id: tempId, conversationId, senderId: currentUserId,
            content: plaintext || '', contentType: 'TEXT',
            attachmentUrl: attachmentUrl || null,
            attachmentMeta: attachment ? { fileName: attachment.name, mimeType: attachment.type, fileSize: attachment.size } : null,
            createdAt: new Date().toISOString(), isPending: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        const payload = {
            conversationId,
            content: encryptedPayload,
            contentType: 'SIGNAL_ENCRYPTED',
            attachmentUrl,
        };

        socketClient.emit('send_message', payload, async (ack) => {
            if (ack && !ack.success) {
                setError(ack.error);
                setMessages(prev => prev.filter(m => m.id !== tempId));
            } else if (ack && ack.success) {
                const finalizedMsg = {
                    ...ack.message, content: plaintext || '', contentType: 'TEXT',
                    attachmentUrl: attachmentUrl || null,
                    attachmentMeta: attachment ? { fileName: attachment.name, mimeType: attachment.type, fileSize: attachment.size } : null,
                };
                setMessages(prev => prev.map(m => m.id === tempId ? finalizedMsg : m));
                try {
                    await signalStoreAdapter.saveLocalMessage(finalizedMsg);
                } catch (e) {
                    console.error('Failed to stash local message cache', e);
                }
            }
        });

    } catch (err) {
        console.error("Encryption failed:", err);
        setError(err.message);
    }
}
