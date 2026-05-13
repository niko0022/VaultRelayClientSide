import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

/**
 * Parses the decrypted plaintext of a message that has an attachmentUrl.
 * If the plaintext is a JSON envelope containing an AES key, extracts
 * the attachment metadata and returns the display text separately.
 *
 * @param {string} plaintext - The decrypted Signal plaintext.
 * @param {string} msgId - The message ID (for logging).
 * @returns {{ displayContent: string, attachmentMeta: object|null }}
 */
function parseAttachmentEnvelope(plaintext, msgId) {
    let attachmentMeta = null;
    let displayContent = plaintext;

    try {
        const parsed = JSON.parse(plaintext);
        if (parsed.aesKey) {
            attachmentMeta = {
                aesKey: parsed.aesKey,
                iv: parsed.iv,
                fileName: parsed.fileName,
                mimeType: parsed.mimeType,
                fileSize: parsed.fileSize,
            };
            displayContent = parsed.text || '';
        }
    } catch (parseErr) {
        console.warn(`[Attachment] msg ${msgId} has attachmentUrl but content is not JSON. Displaying as plain text. Reason: ${parseErr.message}`);
    }

    return { displayContent, attachmentMeta };
}

/**
 * Processes raw server messages: handles key distribution, decrypts
 * Signal-encrypted messages, and extracts attachment metadata.
 *
 * @param {Array} rawMessages - Messages from the backend API.
 * @param {Map} localMap - Map of message ID → cached decrypted message from IndexedDB.
 * @param {object} deps - All required dependencies.
 * @returns {Promise<Array>} Processed messages ready for the UI.
 */
export async function processMessages(rawMessages, localMap, {
    isReady, isGroup, conversationId, currentUserId,
    decryptedCacheRef, directDecrypt, decryptGroupMessage, processGroupDistribution,
}) {
    if (!isReady) return rawMessages;

    const processed = [];
    for (const msg of rawMessages) {

        // Handle Key Distribution Messages
        if (msg.contentType === 'SIGNAL_KEY_DISTRIBUTION') {
            if (localMap.has(msg.id)) {
                continue;
            }

            if (isGroup && msg.senderId !== currentUserId) {
                try {
                    let parsedMap = msg.content;
                    if (typeof msg.content === 'string') parsedMap = JSON.parse(msg.content);

                    await processGroupDistribution(msg.senderId, conversationId, parsedMap);
                } catch (err) {
                    console.error('Failed to unpack distribution key:', err);
                }
            }

            // Cache it so we never try to decrypt this exact message ID again
            const cacheMsg = { ...msg, conversationId, content: 'processed' };
            signalStoreAdapter.saveLocalMessage(cacheMsg).catch(e => console.error(e));

            // Key distribution is a system message — don't show it in the UI list
            continue;
        }

        if (msg.contentType === 'SIGNAL_ENCRYPTED') {
            // If it is in local IndexedDB history (we sent it OR we already received and decrypted it in a past session)
            if (localMap.has(msg.id)) {
                processed.push(localMap.get(msg.id));
                continue;
            }

            if (msg.senderId === currentUserId) {
                // If not in local cache (should be rare), just mark as sent
                processed.push({ ...msg, content: 'Message Sent' });
            } else {
                // If we already decrypted this message in THIS session (in RAM cache)
                if (decryptedCacheRef.current.has(msg.id)) {
                    processed.push({ ...msg, content: decryptedCacheRef.current.get(msg.id), isDecrypted: true });
                    continue;
                }
                try {
                    let plaintext = 'Error decrypting message';
                    if (isGroup) {
                        plaintext = await decryptGroupMessage(msg.senderId, conversationId, msg.content);
                    } else {
                        plaintext = await directDecrypt(msg.content);
                    }
                    decryptedCacheRef.current.set(msg.id, plaintext);

                    // Detect if this is an attachment message
                    let attachmentMeta = null;
                    let displayContent = plaintext;
                    if (msg.attachmentUrl) {
                        ({ displayContent, attachmentMeta } = parseAttachmentEnvelope(plaintext, msg.id));
                    }

                    const finalizedMsg = {
                        ...msg, content: displayContent, isDecrypted: true, contentType: 'TEXT',
                        attachmentMeta,
                    };
                    processed.push(finalizedMsg);

                    // Save the freshly decrypted message to IndexedDB so next time we load from server
                    // we read it from local cache instead of double-decrypting and breaking the ratchet.
                    signalStoreAdapter.saveLocalMessage(finalizedMsg).catch(e => {
                        console.error('Failed to cache decrypted message', e);
                    });
                } catch (err) {
                    console.error("Failed to decrypt message", msg.id, err);
                    processed.push({ ...msg, content: 'Error decrypting message', isDecrypted: false });
                }
            }
        } else {
            processed.push(msg);
        }
    }
    return processed;
}
