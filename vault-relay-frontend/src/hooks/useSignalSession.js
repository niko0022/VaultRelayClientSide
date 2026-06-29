import { useState, useEffect, useCallback, useRef } from 'react';
import init, {
    SessionCipher, SessionBuilder, SignalProtocolAddress, initIdentity
} from 'signal-wasm-bridge';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { ensureWasmReady } from '../lib/signal/initWasm';
import { uint8ArrayToBase64, base64ToUint8Array, decodeServerBundle } from '../lib/signal/signalUtils';

export function useSignalSession(remoteName) {
    const [isReady, setIsReady] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const hasSessionRef = useRef(false);
    const [error, setError] = useState(null);

    // Maps to hold WASM objects per device ID
    const ciphersRef = useRef(new Map()); // Map<deviceId, SessionCipher>
    const addressesRef = useRef(new Map()); // Map<deviceId, SignalProtocolAddress>
    const wasmReady = useRef(false);

    // Initialize WASM
    useEffect(() => {
        let active = true;

        const loadWasm = async () => {
            try {
                await ensureWasmReady(init, initIdentity);
                if (!active) return;
                wasmReady.current = true;
                setIsReady(true);
            } catch (e) {
                console.error("Failed to initialize Signal WASM:", e);
                if (active) setError(e);
            }
        };

        loadWasm();

        return () => {
            active = false;
            ciphersRef.current.forEach(cipher => cipher.free());
            ciphersRef.current.clear();
            addressesRef.current.forEach(address => address.free());
            addressesRef.current.clear();
        };
    }, []);

    /**
     * Establishes Signal sessions using the remote user's active device pre-key bundles.
     * @param {Array<Object>|Object} bundlesInput - Array of device bundles for the remote user
     */
    const establishSession = useCallback(async (bundlesInput) => {
        if (!wasmReady.current || !remoteName) {
            throw new Error("Cannot establish direct session: WASM not ready or no remote user specified");
        }

        const bundles = Array.isArray(bundlesInput) ? bundlesInput : [bundlesInput];
        const builder = new SessionBuilder();

        try {
            for (const bundle of bundles) {
                const decodedBundle = decodeServerBundle(bundle);
                const deviceId = decodedBundle.deviceId;
                const addressKey = `${remoteName}.${deviceId}`;

                // Get or create SignalProtocolAddress
                let address = addressesRef.current.get(deviceId);
                if (!address) {
                    address = new SignalProtocolAddress(remoteName, deviceId);
                    addressesRef.current.set(deviceId, address);
                }

                // Check if we already have an established session in IndexedDB
                const existingSession = await signalStoreAdapter.loadSession(addressKey);

                if (!existingSession) {
                    await builder.processPreKeyBundleWithKyber(
                        address,
                        decodedBundle.registrationId,
                        decodedBundle.deviceId,
                        decodedBundle.preKeyId,
                        decodedBundle.preKeyPublicKey,
                        decodedBundle.signedPreKeyId,
                        decodedBundle.signedPreKeyPublicKey,
                        decodedBundle.signedPreKeySignature,
                        decodedBundle.identityKey,
                        decodedBundle.kyberPreKeyId,
                        decodedBundle.kyberPreKeyPublicKey,
                        decodedBundle.kyberPreKeySignature
                    );
                }

                // Create and cache SessionCipher
                if (!ciphersRef.current.has(deviceId)) {
                    ciphersRef.current.set(deviceId, new SessionCipher(address));
                }
            }

            setHasSession(true);
            hasSessionRef.current = true;
        } finally {
            builder.free();
        }
    }, [remoteName]);

    /**
     * Tears down all sessions with the remote user.
     */
    const resetSession = useCallback(async () => {
        if (!wasmReady.current) {
            throw new Error("WASM not initialized yet");
        }

        // Free and clear ciphers
        ciphersRef.current.forEach(cipher => cipher.free());
        ciphersRef.current.clear();

        // Remove the session records from IndexedDB
        if (remoteName) {
            await signalStoreAdapter.removeSessionsAndIdentitiesForUser(remoteName);
        }

        setHasSession(false);
        hasSessionRef.current = false;
    }, [remoteName]);

    // ─── Active Messaging Logic ──────────────────────────────────────

    /**
     * Encrypts the plaintext separately for each of the remote user's device ciphers.
     * Returns a map: { [userId.deviceId]: { type, body } }
     */
    const encryptMessage = useCallback(async (text) => {
        if (ciphersRef.current.size === 0) {
            throw new Error("No active sessions — call establishSession first");
        }

        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        const results = {};

        for (const [deviceId, cipher] of ciphersRef.current.entries()) {
            const result = await cipher.encrypt(bytes);
            results[`${remoteName}.${deviceId}`] = {
                type: result.type,
                body: uint8ArrayToBase64(result.body)
            };
        }

        return results;
    }, [remoteName]);

    /**
     * Decrypts an incoming message slice targeted at this device.
     */
    const decryptMessage = useCallback(async (encryptedMessage, senderDeviceId = 1) => {
        let parsed = encryptedMessage;
        if (typeof encryptedMessage === 'string') {
            parsed = JSON.parse(encryptedMessage);
        }

        const { type: msgType, body } = parsed;
        const bodyBytes = typeof body === 'string' ? base64ToUint8Array(body) : body;

        const devId = parseInt(senderDeviceId);

        // Lazily instantiate cipher if it exists in IndexedDB but not memory
        let cipher = ciphersRef.current.get(devId);
        if (!cipher) {
            const addressKey = `${remoteName}.${devId}`;
            const sessionRecord = await signalStoreAdapter.loadSession(addressKey);
            if (!sessionRecord) {
                throw new Error(`No session found for ${addressKey} — cannot decrypt`);
            }
            // Only create cipher if session is confirmed to exist
            let address = addressesRef.current.get(devId);
            if (!address) {
                address = new SignalProtocolAddress(remoteName, devId);
                addressesRef.current.set(devId, address);
            }
            cipher = new SessionCipher(address);
            ciphersRef.current.set(devId, cipher);
        }

        try {
            const plaintextBytes = await cipher.decrypt(msgType, bodyBytes);
            const decoder = new TextDecoder();

            if (!hasSessionRef.current) {
                setHasSession(true);
                hasSessionRef.current = true;
            }

            return decoder.decode(plaintextBytes);
        } catch (e) {
            if (e && typeof e === 'object' && e.type === 'UntrustedIdentity') {
                const err = new Error(e.message);
                err.name = 'UntrustedIdentityError';
                err.address = e.address || null;
                console.error("Identity changed:", err);
                throw err;
            }
            console.error("Decryption failed:", e);
            throw e;
        }
    }, [remoteName]);

    return {
        isReady,
        hasSession,
        error,
        establishSession,
        resetSession,
        encryptMessage,
        decryptMessage
    };
}
