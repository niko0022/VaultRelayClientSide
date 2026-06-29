import { useState, useEffect, useCallback, useRef } from 'react';
import init, {
    SessionCipher, SessionBuilder, SignalProtocolAddress, initIdentity,
    GroupSessionBuilder, GroupCipher
} from 'signal-wasm-bridge';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { ensureWasmReady } from '../lib/signal/initWasm';
import { uint8ArrayToBase64, base64ToUint8Array, decodeServerBundle } from '../lib/signal/signalUtils';

export function useGroupSignalSession(currentUserId) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    const wasmReady = useRef(false);
    const ciphersRef = useRef(new Map()); // Map<addressKey (userId.deviceId), SessionCipher>
    const groupCiphersRef = useRef(new Map()); // Map<cacheKey (senderId.deviceId_groupId), GroupCipher>

    useEffect(() => {
        let active = true;
        const loadWasm = async () => {
            try {
                await ensureWasmReady(init, initIdentity);
                if (!active) return;
                wasmReady.current = true;
                setIsReady(true);
            } catch (e) {
                console.error("Failed to init WASM:", e);
                if (active) setError(e);
            }
        };
        loadWasm();

        return () => {
            active = false;
            ciphersRef.current.forEach(cipher => cipher.free());
            ciphersRef.current.clear();
            groupCiphersRef.current.forEach(cipher => cipher.free());
            groupCiphersRef.current.clear();
        };
    }, []);

    // Load or establish 1-to-1 relationships for group member devices
    const establishGroupSessions = useCallback(async (bundles) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const builder = new SessionBuilder();
        try {
            for (const bundle of bundles) {
                const remoteUserId = bundle.userId;
                const deviceId = bundle.deviceId;
                const addressKey = `${remoteUserId}.${deviceId}`;

                if (ciphersRef.current.has(addressKey)) continue;

                const address = new SignalProtocolAddress(remoteUserId, deviceId);
                const sessionRecord = await signalStoreAdapter.loadSession(addressKey);

                if (sessionRecord) {
                    ciphersRef.current.set(addressKey, new SessionCipher(address));
                } else if (bundle.registrationId) {
                    const decoded = decodeServerBundle(bundle);
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
                    ciphersRef.current.set(addressKey, new SessionCipher(address));
                }
                address.free();
            }
        } finally {
            builder.free();
        }
    }, []);

    // Creates the SenderKeyDistributionMessage, encrypts it individually for all group member devices,
    // and returns the { [userId.deviceId]: { type, body } } map.
    const generateGroupDistributionMap = useCallback(async (groupId, participantIds) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const myDeviceId = await signalStoreAdapter.getDeviceId();
        const myAddress = new SignalProtocolAddress(currentUserId, myDeviceId);
        const builder = new GroupSessionBuilder();

        try {
            const skdmObj = await builder.createSenderKeyDistributionMessage(myAddress, groupId);
            const skdmBytes = skdmObj instanceof Uint8Array
                ? skdmObj
                : new Uint8Array(Object.values(skdmObj));

            const distributionMap = {};
            const { chatService } = await import('../services/chatService');

            // Fetch pre-key bundles for all devices of all participants
            const response = await chatService.getPreKeyBundles(participantIds);
            const bundles = response.bundles || response;

            // Ensure we have established sessions for all target devices
            await establishGroupSessions(bundles);

            for (const bundle of bundles) {
                const peerId = bundle.userId;
                const deviceId = bundle.deviceId;

                // Skip encrypting for ourselves on the sending device
                if (peerId === currentUserId && deviceId === myDeviceId) continue;

                const addressKey = `${peerId}.${deviceId}`;
                const cipher = ciphersRef.current.get(addressKey);

                if (!cipher) {
                    console.warn(`No 1-to-1 cipher for ${addressKey} — skipping group distribution.`);
                    continue;
                }

                const result = await cipher.encrypt(skdmBytes);
                distributionMap[addressKey] = {
                    type: result.type,
                    body: uint8ArrayToBase64(result.body instanceof Uint8Array ? result.body : new Uint8Array(result.body))
                };
            }

            return distributionMap;
        } finally {
            builder.free();
            myAddress.free();
        }
    }, [currentUserId, establishGroupSessions]);

    // Processes a received SIGNAL_KEY_DISTRIBUTION map, pulling our own slice.
    const processGroupDistribution = useCallback(async (senderId, senderDeviceId, groupId, keyBlobMap) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const myDeviceId = await signalStoreAdapter.getDeviceId();
        const myAddressKey = `${currentUserId}.${myDeviceId}`;
        const mySlice = keyBlobMap[myAddressKey];
        if (!mySlice) return; // We aren't in this distribution slice

        const senderAddressKey = `${senderId}.${senderDeviceId}`;

        // Establish 1-to-1 session if not cached
        if (!ciphersRef.current.has(senderAddressKey)) {
            try {
                const { chatService } = await import('../services/chatService');
                const bundles = await chatService.getPreKeyBundle(senderId);
                await establishGroupSessions(bundles);
            } catch (err) {
                console.error(`Failed to establish session with ${senderAddressKey} on distribution:`, err);
                return;
            }
        }

        const cipher = ciphersRef.current.get(senderAddressKey);
        if (!cipher) {
            console.error(`Still no 1-to-1 cipher for ${senderAddressKey} — cannot decrypt distribution.`);
            return;
        }

        const bodyBytes = typeof mySlice.body === 'string'
            ? base64ToUint8Array(mySlice.body)
            : new Uint8Array(Object.values(mySlice.body));

        const plaintextBytes = await cipher.decrypt(mySlice.type, bodyBytes);

        const builder = new GroupSessionBuilder();
        const senderAddress = new SignalProtocolAddress(senderId, parseInt(senderDeviceId));
        try {
            await builder.processSenderKeyDistributionMessage(senderAddress, plaintextBytes);
        } finally {
            builder.free();
            senderAddress.free();
        }
    }, [currentUserId, establishGroupSessions]);

    // Group Message Cipher caching helper
    const getGroupCipher = (senderId, senderDeviceId, groupId) => {
        const cacheKey = `${senderId}.${senderDeviceId}_${groupId}`;
        let gc = groupCiphersRef.current.get(cacheKey);
        if (!gc) {
            const addr = new SignalProtocolAddress(senderId, parseInt(senderDeviceId));
            gc = new GroupCipher(addr);
            groupCiphersRef.current.set(cacheKey, gc);
            addr.free();
        }
        return gc;
    };

    const encryptGroupMessage = useCallback(async (groupId, plaintext) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        const myDeviceId = await signalStoreAdapter.getDeviceId();
        const groupCipher = getGroupCipher(currentUserId, myDeviceId, groupId);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(plaintext);

        const result = await groupCipher.encrypt(groupId, bytes);

        return {
            type: result.type,
            body: uint8ArrayToBase64(result.body instanceof Uint8Array ? result.body : new Uint8Array(result.body))
        };
    }, [currentUserId]);

    const decryptGroupMessage = useCallback(async (senderId, senderDeviceId, groupId, encryptedMessage) => {
        if (!wasmReady.current) throw new Error("WASM not ready");

        let parsed = encryptedMessage;
        if (typeof encryptedMessage === 'string') {
            parsed = JSON.parse(encryptedMessage);
        }
        const { body } = parsed;
        const bodyBytes = typeof body === 'string'
            ? base64ToUint8Array(body)
            : new Uint8Array(Object.values(body));

        const groupCipher = getGroupCipher(senderId, senderDeviceId, groupId);

        const plaintextBytes = await groupCipher.decrypt(bodyBytes);
        const decoder = new TextDecoder();
        return decoder.decode(plaintextBytes);
    }, []);

    const clearCiphersCache = useCallback(() => {
        ciphersRef.current.forEach(cipher => cipher.free());
        ciphersRef.current.clear();
        groupCiphersRef.current.forEach(cipher => cipher.free());
        groupCiphersRef.current.clear();
    }, []);

    return {
        isReady,
        error,
        establishGroupSessions,
        generateGroupDistributionMap,
        processGroupDistribution,
        encryptGroupMessage,
        decryptGroupMessage,
        clearCiphersCache
    };
}
