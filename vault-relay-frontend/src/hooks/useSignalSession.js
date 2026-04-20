import { useState, useEffect, useCallback, useRef } from 'react';
import init, {
    SessionCipher, SessionBuilder, SignalProtocolAddress, initIdentity
} from 'signal-wasm-bridge';
import { signalStoreAdapter } from '../lib/signal/SignalStoreAdapter';
import { ensureWasmReady } from '../lib/signal/initWasm';
import { uint8ArrayToBase64, base64ToUint8Array, decodeServerBundle } from '../lib/signal/signalUtils';


export function useSignalSession(remoteName, remoteDeviceId) {
    const [isReady, setIsReady] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [error, setError] = useState(null);

    // Refs to hold WASM objects to avoid re-creating on every render
    const cipherRef = useRef(null);
    const addressRef = useRef(null);
    const builderRef = useRef(null);
    const wasmReady = useRef(false);

    // Initialize WASM and check for existing session
    useEffect(() => {
        let active = true;

        const loadWasm = async () => {
            try {
                // Single shared init — passes our own init to guarantee same module instance
                await ensureWasmReady(init, initIdentity);
                if (!active) return;
                wasmReady.current = true;

                if (!remoteName) {
                    // Chat window is open, but no specific user is selected yet. Skip session loading.
                    return;
                }

                // Create the protocol address
                const address = new SignalProtocolAddress(remoteName, parseInt(remoteDeviceId));
                addressRef.current = address;

                // Check if we already have an established session
                const addressKey = `${remoteName}.${remoteDeviceId}`;
                const existingSession = await signalStoreAdapter.loadSession(addressKey);

                if (existingSession) {
                    // Session exists — create cipher directly
                    const sessionCipher = new SessionCipher(address);
                    cipherRef.current = sessionCipher;
                    setHasSession(true);
                }

                setIsReady(true);
            } catch (e) {
                console.error("Failed to initialize Signal WASM:", e);
                if (active) setError(e);
            }
        };

        loadWasm();

        return () => {
            active = false;
            if (cipherRef.current) {
                cipherRef.current.free();
                cipherRef.current = null;
            }
            if (addressRef.current) {
                addressRef.current.free();
                addressRef.current = null;
            }
            if (builderRef.current) {
                builderRef.current.free();
                builderRef.current = null;
            }
        };
    }, [remoteName, remoteDeviceId]);

    /**
     * Establishes a new Signal session using the remote user's pre-key bundle.
     * @param {Object} bundle - The remote user's pre-key bundle from the server
     */
    const establishSession = useCallback(async (bundle) => {
        if (!wasmReady.current || !addressRef.current) {
            throw new Error("WASM not initialized yet");
        }
        if (cipherRef.current) {
            throw new Error("Session already established — call resetSession() first if re-keying");
        }

        // Decode the server bundle mapping JSON Base64 strings to raw Uint8Arrays
        const decodedBundle = decodeServerBundle(bundle, parseInt(remoteDeviceId));

        // Free any previously leaked builder
        if (builderRef.current) {
            builderRef.current.free();
            builderRef.current = null;
        }

        const builder = new SessionBuilder();
        builderRef.current = builder;

        await builder.processPreKeyBundleWithKyber(
            addressRef.current,
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

        // Builder is done — free it immediately
        builder.free();
        builderRef.current = null;

        // Session is now stored — create the cipher
        const sessionCipher = new SessionCipher(addressRef.current);
        cipherRef.current = sessionCipher;
        setHasSession(true);
    }, []);

    /**
     * Tears down the current session so a new one can be established.
     * Use this when the remote user reinstalls their app (new Identity Key)
     * or when you need to force a re-key for any reason.
     */
    const resetSession = useCallback(async () => {
        if (!wasmReady.current) {
            throw new Error("WASM not initialized yet");
        }

        // Free the existing WASM cipher object
        if (cipherRef.current) {
            cipherRef.current.free();
            cipherRef.current = null;
        }

        // Remove the session record from IndexedDB
        if (addressRef.current) {
            const addressKey = `${remoteName}.${remoteDeviceId}`;
            await signalStoreAdapter.storeSession(addressKey, null);
        }

        setHasSession(false);
    }, [remoteName, remoteDeviceId]);

    // ─── Active Messaging Logic ──────────────────────────────────────

    const encryptMessage = useCallback(async (text) => {
        if (!cipherRef.current) throw new Error("No session — call establishSession first");

        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        // WASM returns { type: number, body: Uint8Array }
        const result = await cipherRef.current.encrypt(bytes);

        // Convert body to Base64 so it survives JSON serialization over the socket
        return {
            type: result.type,
            body: uint8ArrayToBase64(result.body)
        };
    }, []);

    const decryptMessage = useCallback(async (encryptedMessage) => {
        if (!cipherRef.current) throw new Error("No session — call establishSession first");

        // Parse if it arrives as a raw JSON string from the DB
        let parsed = encryptedMessage;
        if (typeof encryptedMessage === 'string') {
            parsed = JSON.parse(encryptedMessage);
        }

        const { type: msgType, body } = parsed;

        // Decode Base64 body back to Uint8Array for the WASM decryptor
        const bodyBytes = typeof body === 'string'
            ? base64ToUint8Array(body)
            : body; // Already Uint8Array from WASM

        try {
            const plaintextBytes = await cipherRef.current.decrypt(msgType, bodyBytes);
            const decoder = new TextDecoder();
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
    }, []);

    return {
        isReady,       // true once WASM is loaded (but session may not exist yet)
        hasSession,    // true once a session is established or was found in storage
        error,
        establishSession,
        resetSession,
        encryptMessage,
        decryptMessage
    };
}
