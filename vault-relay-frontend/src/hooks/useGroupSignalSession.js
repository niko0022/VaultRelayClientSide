import { useState, useEffect, useCallback, useRef } from 'react';
import init, {
    SessionCipher, SessionBuilder, SignalProtocolAddress, initIdentity,
    GroupSessionBuilder, GroupCipher
} from 'signal-wasm-bridge';
import { signalStoreAdapter, initSignalStorage } from '../lib/signal/SignalStoreAdapter';
import { verifyCryptoIntegrity } from '../lib/signal/verifyCryptoIntegrity';
import { uint8ArrayToBase64, base64ToUint8Array, decodeServerBundle } from '../lib/signal/signalUtils';

export function useGroupSignalSession(currentUserId) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    // Refs
    const wasmReady = useRef(false);
    const ciphersRef = useRef(new Map()); // Map<userId, SessionCipher>
    const groupCiphersRef = useRef(new Map()); // Map<groupId, GroupCipher>

    useEffect(() => {
        let active = true;
        const loadWasm = async () => {
            try {
                await verifyCryptoIntegrity();
                initSignalStorage();
                await init();
                if (!active) return;
                wasmReady.current = true;
                await initIdentity();
                setIsReady(true);
            } catch (e) {
                console.error("Failed to init WASM:", e);
                if (active) setError(e);
            }
        };
        loadWasm();

        return () => {
            active = false;
            // Memory Management
            ciphersRef.current.forEach(cipher => cipher.free());
            ciphersRef.current.clear();

            groupCiphersRef.current.forEach(cipher => cipher.free());
            groupCiphersRef.current.clear();
        };
    }, []);

    // ─── 1. Load or establish 1-to-1 relationships for group members ──────

    // Call this with the pre-key bundles from `/keys/batch` 
    // It skips participants we already have sessions for.
    const establishGroupSessions = useCallback(async (bundles) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const builder = new SessionBuilder();
        try {
            for (const bundle of bundles) {
                const remoteUserId = bundle.userId;
                const addressKey = `${remoteUserId}.1`;

                // 1. Check if cipher already exists in RAM
                if (ciphersRef.current.has(remoteUserId)) continue;

                const address = new SignalProtocolAddress(remoteUserId, 1);

                // 2. Check if session already exists in DB
                const sessionRecord = await signalStoreAdapter.loadSession(addressKey);

                if (sessionRecord) {
                    ciphersRef.current.set(remoteUserId, new SessionCipher(address));
                } else if (bundle.registrationId) {
                    // 3. Process the bundle from the backend
                    const decoded = decodeServerBundle(bundle, 1);
                    await builder.processPreKeyBundleWithKyber(
                        address,
                        decoded.registrationId,
                        decoded.deviceId,
                        decoded.preKeyId,
                        decoded.preKeyPublicKey,
                        decoded.signedPreKeyId,
                        decoded.signedPreKeyPublicKey,
                        decoded.signedPreKeySignature,
                        decoded.identityKey,
                        decoded.kyberPreKeyId,
                        decoded.kyberPreKeyPublicKey,
                        decoded.kyberPreKeySignature
                    );
                    ciphersRef.current.set(remoteUserId, new SessionCipher(address));
                }
                address.free();
            }
        } finally {
            builder.free();
        }
    }, []);

    // ─── 2. Key Distribution ──────────────────────────────────────────

    // Creates the SenderKeyDistributionMessage, encrypts it individually for all members,
    // and returns the { [userId]: { type, body } } map for backend storage Option A.
    const generateGroupDistributionMap = useCallback(async (groupId, participantIds) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const builder = new GroupSessionBuilder();
        const myAddress = new SignalProtocolAddress(currentUserId, 1);

        try {
            // Generates SenderKeyMessage payload bytes natively mapped from Rust array buffer
            const skdmObj = await builder.createSenderKeyDistributionMessage(myAddress, groupId);
            const skdmBytes = skdmObj instanceof Uint8Array
                ? skdmObj
                : new Uint8Array(Object.values(skdmObj));

            const distributionMap = {};

            // Send the SKDM to every participant using 1-to-1 ciphers!
            for (const peerId of participantIds) {
                if (peerId === currentUserId) continue;

                let cipher = ciphersRef.current.get(peerId);

                // If no cipher exists, try to establish one on the fly
                if (!cipher) {
                    console.warn(`No cipher for ${peerId}, fetching bundle on the fly...`);
                    try {
                        const { chatService } = await import('../services/chatService');
                        const bundle = await chatService.getPreKeyBundle(peerId);
                        await establishGroupSessions([{ ...bundle, userId: peerId }]);
                        cipher = ciphersRef.current.get(peerId);
                    } catch (err) {
                        console.error(`Failed to establish session with ${peerId}:`, err);
                    }
                }

                if (!cipher) {
                    console.warn(`Still no cipher for ${peerId} after fallback — skipping distribution.`);
                    continue;
                }

                // 1-to-1 Encrypt the raw bytes
                const result = await cipher.encrypt(skdmBytes);
                distributionMap[peerId] = {
                    type: result.type,
                    // Convert back to stable String because DB stores it natively
                    body: uint8ArrayToBase64(result.body instanceof Uint8Array ? result.body : new Uint8Array(result.body))
                };
            }

            return distributionMap;
        } finally {
            builder.free();
            myAddress.free();
        }
    }, [currentUserId, establishGroupSessions]);

    // Processes a received SIGNAL_KEY_DISTRIBUTION map, pulling our own blob.
    const processGroupDistribution = useCallback(async (senderId, groupId, keyBlobMap) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const mySlice = keyBlobMap[currentUserId];
        if (!mySlice) return; // We aren't in this distribution

        // If we don't have a 1-to-1 cipher yet, establish one on the fly
        if (!ciphersRef.current.has(senderId)) {
            console.warn(`No 1-to-1 cipher for ${senderId}, fetching bundle on the fly...`);
            try {
                const { chatService } = await import('../services/chatService');
                const bundle = await chatService.getPreKeyBundle(senderId);
                await establishGroupSessions([{ ...bundle, userId: senderId }]);
            } catch (err) {
                console.error(`Failed to establish on-the-fly session with ${senderId}:`, err);
                return;
            }
        }

        const cipher = ciphersRef.current.get(senderId);
        if (!cipher) {
            console.error(`Still no cipher for ${senderId} after fallback — cannot process distribution.`);
            return;
        }

        const bodyBytes = typeof mySlice.body === 'string'
            ? base64ToUint8Array(mySlice.body)
            : new Uint8Array(Object.values(mySlice.body));

        // 1-to-1 decrypt
        const plaintextBytes = await cipher.decrypt(mySlice.type, bodyBytes);

        // Store into SenderKeyStore
        const builder = new GroupSessionBuilder();
        const senderAddress = new SignalProtocolAddress(senderId, 1);
        try {
            await builder.processSenderKeyDistributionMessage(senderAddress, plaintextBytes);
        } finally {
            builder.free();
            senderAddress.free();
        }
    }, [currentUserId, establishGroupSessions]);

    // ─── 3. Group Messaging ───────────────────────────────────────────

    // Helper to cache group ciphers (so we don't recreate them every message)
    const getGroupCipher = (senderId, groupId) => {
        const cacheKey = `${senderId}_${groupId}`;
        let gc = groupCiphersRef.current.get(cacheKey);
        if (!gc) {
            const addr = new SignalProtocolAddress(senderId, 1);
            gc = new GroupCipher(addr);
            groupCiphersRef.current.set(cacheKey, gc);
            addr.free();
        }
        return gc;
    };

    const encryptGroupMessage = useCallback(async (groupId, plaintext) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const groupCipher = getGroupCipher(currentUserId, groupId);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(plaintext);

        const result = await groupCipher.encrypt(groupId, bytes);

        return {
            type: result.type,
            body: uint8ArrayToBase64(result.body instanceof Uint8Array ? result.body : new Uint8Array(result.body))
        };
    }, [currentUserId]);

    const decryptGroupMessage = useCallback(async (senderId, groupId, encryptedMessage) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        let parsed = encryptedMessage;
        if (typeof encryptedMessage === 'string') {
            parsed = JSON.parse(encryptedMessage);
        }
        const { body } = parsed;
        const bodyBytes = typeof body === 'string'
            ? base64ToUint8Array(body)
            : new Uint8Array(Object.values(body));

        const groupCipher = getGroupCipher(senderId, groupId);

        try {
            const plaintextBytes = await groupCipher.decrypt(bodyBytes);
            const decoder = new TextDecoder();
            return decoder.decode(plaintextBytes);
        } catch (e) {
            console.error("Group decryption failed:", e);
            throw e;
        }
    }, []);

    return {
        isReady,
        error,
        establishGroupSessions,
        generateGroupDistributionMap,
        processGroupDistribution,
        encryptGroupMessage,
        decryptGroupMessage
    };
}
