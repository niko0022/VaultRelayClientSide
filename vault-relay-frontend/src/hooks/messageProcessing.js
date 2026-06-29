import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';

/**
 * Parses the decrypted plaintext of a message that has an attachmentUrl.
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
 * Helper to extract device slice from fanned-out map in 1-to-1 chats
 */
async function extractDeviceSlice(msg, currentUserId, isGroup) {
    if (isGroup) return msg.content;
    if (!msg.content || typeof msg.content !== 'string' || !msg.content.startsWith('{')) {
        return msg.content;
    }
    try {
        const parsedMap = JSON.parse(msg.content);
        if (parsedMap && typeof parsedMap === 'object' && !parsedMap.type) {
            const myDeviceId = await signalStoreAdapter.getDeviceId();
            const myAddressKey = `${currentUserId}.${myDeviceId}`;
            const mySlice = parsedMap[myAddressKey];
            if (!mySlice) throw new Error('No slice found for current device');
            return mySlice;
        }
    } catch (e) {
        // Not a JSON map
    }
    return msg.content;
}

/**
 * Processes raw server messages: handles key distribution, decrypts
 * Signal-encrypted messages, and extracts attachment metadata.
 */
export async function processMessages(rawMessages, localMap, deps) {
    const {
        isReady, isGroup, conversationId, currentUserId,
        decryptedCacheRef, directDecrypt, decryptGroupMessage, processGroupDistribution,
        selfDecrypt,
    } = deps;
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

                    await processGroupDistribution(msg.senderId, msg.senderDeviceId, conversationId, parsedMap);
                } catch (err) {
                    console.error('Failed to unpack distribution key:', err);
                }
            }

            // Cache it so we never try to decrypt this exact message ID again
            const cacheMsg = { ...msg, conversationId, content: 'processed' };
            signalStoreAdapter.saveLocalMessage(cacheMsg).catch(e => console.error(e));

            continue;
        }

        // Handle Encrypted Reactions
        if (msg.contentType === 'SIGNAL_REACTION') {
            if (localMap.has(msg.id)) {
                continue;
            }

            if (decryptedCacheRef.current.has(msg.id)) {
                continue;
            }
            try {
                let slice = msg.content;
                if (!isGroup) {
                    slice = await extractDeviceSlice(msg, currentUserId, isGroup);
                }
                if (!slice) continue; // Not addressed to us

                let plaintext;
                if (isGroup) {
                    plaintext = await decryptGroupMessage(msg.senderId, msg.senderDeviceId, conversationId, slice);
                } else {
                    if (msg.senderId === currentUserId) {
                        if (selfDecrypt) {
                            plaintext = await selfDecrypt(slice, msg.senderDeviceId);
                        } else {
                            throw new Error('Self decrypt not available');
                        }
                    } else {
                        plaintext = await directDecrypt(slice, msg.senderDeviceId);
                    }
                }
                decryptedCacheRef.current.set(msg.id, plaintext);

                const parsed = JSON.parse(plaintext);
                if (parsed && parsed.type === 'REACTION') {
                    const { emoji, targetMessageId, isRemove } = parsed;

                    if (isRemove) {
                        await signalStoreAdapter.removeReaction(targetMessageId, msg.senderId, emoji);
                    } else {
                        await signalStoreAdapter.saveReaction(targetMessageId, conversationId, msg.senderId, emoji);
                    }

                    if (deps.onReactionUpdate) {
                        deps.onReactionUpdate({
                            messageId: targetMessageId,
                            userId: msg.senderId,
                            emoji,
                            isRemove
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to decrypt reaction message:', msg.id, err);
            }

            // Cache it so we never try to decrypt this exact message ID again
            const cacheMsg = { ...msg, conversationId, content: 'processed' };
            signalStoreAdapter.saveLocalMessage(cacheMsg).catch(e => console.error(e));

            continue;
        }

        if (msg.contentType === 'SIGNAL_ENCRYPTED') {
            if (localMap.has(msg.id)) {
                processed.push(localMap.get(msg.id));
                continue;
            }

            if (decryptedCacheRef.current.has(msg.id)) {
                processed.push({ ...msg, content: decryptedCacheRef.current.get(msg.id), isDecrypted: true });
                continue;
            }

            try {
                let slice = msg.content;
                if (!isGroup) {
                    slice = await extractDeviceSlice(msg, currentUserId, isGroup);
                    if (!slice) {
                        processed.push({ ...msg, content: 'Message not available on this device', isDecrypted: false });
                        continue;
                    }
                }

                let plaintext;
                if (isGroup) {
                    plaintext = await decryptGroupMessage(msg.senderId, msg.senderDeviceId, conversationId, slice);
                } else {
                    if (msg.senderId === currentUserId) {
                        if (selfDecrypt) {
                            plaintext = await selfDecrypt(slice, msg.senderDeviceId);
                        } else {
                            throw new Error('Self decrypt not available');
                        }
                    } else {
                        plaintext = await directDecrypt(slice, msg.senderDeviceId);
                    }
                }
                decryptedCacheRef.current.set(msg.id, plaintext);

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

                signalStoreAdapter.saveLocalMessage(finalizedMsg).catch(e => {
                    console.error('Failed to cache decrypted message', e);
                });
            } catch (err) {
                console.error("Failed to decrypt message", msg.id, err);
                processed.push({ ...msg, content: 'Error decrypting message', isDecrypted: false });
            }
        } else {
            processed.push(msg);
        }
    }
    return processed;
}
