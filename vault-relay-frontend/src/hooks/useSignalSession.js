import { useState, useEffect, useCallback, useRef } from 'react';
import init, {
    SessionCipher, SessionBuilder, SignalProtocolAddress, initIdentity,
    generatePreKeys, generateSignedPreKey, generateKyberPreKey,
    extractIdentityPublicKey
} from 'signal-wasm-bridge';
import { signalStoreAdapter, initSignalStorage } from '../lib/signal/SignalStoreAdapter';
import { verifyCryptoIntegrity } from '../lib/signal/verifyCryptoIntegrity';
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
                // Verify crypto integrity BEFORE any WASM or crypto operations
                await verifyCryptoIntegrity();

                // Wire window.signalStorage BEFORE WASM init
                initSignalStorage();

                // Initialize WASM module
                await init();
                if (!active) return;
                wasmReady.current = true;

                // Ensure local identity exists (idempotent — generates only on first run)
                await initIdentity();

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

    /**
     * Generates all required pre-keys and saves private records to IndexedDB.
     * Returns the public data your backend server needs to let others message you.
     *
     * @param {Object} options
     *   - preKeyStartId: number   (default 1) — starting ID for the batch of One-Time PreKeys
     *   - preKeyCount: number     (default 100) — how many One-Time PreKeys to generate
     *   - signedPreKeyId: number  (default 1) — ID for the Signed PreKey
     *   - kyberPreKeyId: number   (default 1) — ID for the Kyber PreKey
     *
     * @returns {Object} Bundle to upload to your server:
     *   - identityKey: Uint8Array          (your public identity key)
     *   - registrationId: number
     *   - oneTimePreKeys: [{ keyId, publicKey }]  (public halves only)
     *   - signedPreKey: { keyId, publicKey, signature }
     *   - kyberPreKey: { keyId, publicKey, signature }
     */
    const generatePreKeyBundle = useCallback(async (options = {}) => {
        if (!wasmReady.current) {
            throw new Error("WASM not initialized yet");
        }

        const {
            preKeyStartId = 1,
            preKeyCount = 100,
            signedPreKeyId = 1,
            kyberPreKeyId = 1
        } = options;

        // Fetch identity (must already exist via initIdentity)
        const identityKeyPairBytes = await signalStoreAdapter.getIdentityKeyPair();
        const registrationId = await signalStoreAdapter.getLocalRegistrationId();

        if (!identityKeyPairBytes || registrationId == null) {
            throw new Error("Identity not initialized — initIdentity must run first");
        }

        // ── 1. Generate One-Time PreKeys ──────────────────────────────
        const preKeys = generatePreKeys(preKeyStartId, preKeyCount);
        //   Each entry: { id: number, record: Uint8Array, publicKey: Uint8Array }

        // Save private records to IndexedDB, collect PUBLIC keys only for server
        const oneTimePreKeysForServer = [];
        for (const pk of preKeys) {
            await signalStoreAdapter.savePreKey(pk.id, pk.record);
            // Send ONLY the public key to the server — converted to Base64
            oneTimePreKeysForServer.push({ 
                keyId: pk.id, 
                publicKey: uint8ArrayToBase64(pk.publicKey) 
            });
        }

        // ── 2. Generate Signed PreKey ─────────────────────────────────
        const spk = generateSignedPreKey(identityKeyPairBytes, signedPreKeyId);
        //   { id, record, publicKey, signature }
        await signalStoreAdapter.saveSignedPreKey(spk.id, spk.record);

        // ── 3. Generate Kyber PreKey (Post-Quantum) ──────────────────
        const kpk = generateKyberPreKey(identityKeyPairBytes, kyberPreKeyId);
        //   { id, record, publicKey, signature }
        await signalStoreAdapter.saveKyberPreKey(kpk.id, kpk.record);

        // ── Return the public data for your backend server ───────────
        // Extract ONLY the public key — NEVER send the full pair to the server
        const identityPublicKey = extractIdentityPublicKey(identityKeyPairBytes);

        return {
            registrationId,
            identityKey: uint8ArrayToBase64(identityPublicKey),
            oneTimePreKeys: oneTimePreKeysForServer,
            signedPreKey: {
                keyId: spk.id,
                publicKey: uint8ArrayToBase64(spk.publicKey),
                signature: uint8ArrayToBase64(spk.signature)
            },
            kyberPreKey: {
                keyId: kpk.id,
                publicKey: uint8ArrayToBase64(kpk.publicKey),
                signature: uint8ArrayToBase64(kpk.signature)
            }
        };
    }, []);

    /**
     * Generates a fresh batch of One-Time PreKeys if the server count is low.
     * Returns null if no replenishment is needed, or the new keys for upload.
     *
     * @param {Object} params
     *   - currentCount: number   — how many unused PreKeys the server currently holds
     *   - nextStartId: number    — the next available PreKey ID (server should track this)
     *   - threshold: number      (default 25) — replenish when count drops below this
     *   - batchSize: number      (default 100) — how many new keys to generate
     *
     * @returns {Array|null} Array of new PreKey objects to upload, or null if not needed
     */
    const replenishPreKeys = useCallback(async ({ currentCount, nextStartId, threshold = 25, batchSize = 100 }) => {
        if (!wasmReady.current) {
            throw new Error("WASM not initialized yet");
        }

        if (currentCount >= threshold) {
            return null; // Server still has plenty of keys
        }

        // Generate a fresh batch
        const preKeys = generatePreKeys(nextStartId, batchSize);

        // Save private records to IndexedDB, collect PUBLIC keys only for server
        const oneTimePreKeysForServer = [];
        for (const pk of preKeys) {
            await signalStoreAdapter.savePreKey(pk.id, pk.record);
            oneTimePreKeysForServer.push({ 
                keyId: pk.id, 
                publicKey: uint8ArrayToBase64(pk.publicKey) 
            });
        }

        // Return ONLY public keys for the caller to upload to the server
        return oneTimePreKeysForServer;
    }, []);

    const encryptMessage = useCallback(async (text) => {
        if (!cipherRef.current) throw new Error("No session — call establishSession first");

        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        // WASM returns { type: number, body: Uint8Array }
        const result = await cipherRef.current.encrypt(bytes);

        // Convert body to Base64 so it survives JSON serialization over the socket
        return {
            type: result.type,
            body: uint8ArrayToBase64(result.body instanceof Uint8Array ? result.body : new Uint8Array(result.body))
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
            : (body instanceof Uint8Array ? body : new Uint8Array(Object.values(body)));

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
        generatePreKeyBundle,
        replenishPreKeys,
        establishSession,
        resetSession,
        encryptMessage,
        decryptMessage
    };
}
