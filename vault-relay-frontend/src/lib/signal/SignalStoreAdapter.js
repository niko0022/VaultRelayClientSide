const DB_NAME = 'signal-storage';
const DB_VERSION = 4;

const STORES = {
    SESSIONS: 'sessions',
    IDENTITIES: 'identities',
    PRE_KEYS: 'preKeys',
    SIGNED_PRE_KEYS: 'signedPreKeys',
    KYBER_PRE_KEYS: 'kyberPreKeys',
    SENDER_KEYS: 'senderKeys',
    CRYPTO_KEYS: 'cryptoKeys',  // Stores the non-extractable Master Wrapping Key
    KYBER_USED_COMBOS: 'kyberUsedCombos',  // Replay detection for Kyber pre-key usage
    LOCAL_MESSAGES: 'localMessages' // WhatsApp-style sender history
};

const MWK_KEY = 'master_wrapping_key';

class SignalStoreAdapter {
    constructor() {
        this.dbPromise = this.openDB().catch(err => {
            console.error('[SignalStore] IndexedDB failed to open:', err);
            throw new Error(
                'IndexedDB is unavailable. Signal storage requires IndexedDB — '
                + 'this may fail in Private/Incognito mode or if storage quota is exceeded.'
            );
        });
        this._mwkPromise = null; // Lazy-initialized
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                Object.values(STORES).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        if (storeName === STORES.LOCAL_MESSAGES) {
                            // Require an index to rapidly fetch messages per conversation
                            const store = db.createObjectStore(storeName, { keyPath: 'id' });
                            store.createIndex('conversationId', 'conversationId', { unique: false });
                        } else {
                            db.createObjectStore(storeName);
                        }
                    }
                });
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    // ─── Raw IndexedDB Helpers ────────────────────────────────────────

    async _rawGet(storeName, key) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async _rawPut(storeName, key, value) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async _rawDelete(storeName, key) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // ─── Master Wrapping Key (MWK) Lifecycle ─────────────────────────

    /**
     * Returns the non-extractable AES-GCM-256 Master Wrapping Key.
     * Generates and persists one if it doesn't exist yet.
     * The CryptoKey object is non-extractable — even if IndexedDB is read
     * by an XSS attacker, the raw key bytes cannot be obtained.
     */
    async _getMasterKey() {
        if (!this._mwkPromise) {
            this._mwkPromise = this._loadOrCreateMasterKey();
        }
        return this._mwkPromise;
    }

    async _loadOrCreateMasterKey() {
        const existing = await this._rawGet(STORES.CRYPTO_KEYS, MWK_KEY);
        if (existing) return existing;

        const key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,  // NON-EXTRACTABLE — this is the critical security property
            ['encrypt', 'decrypt']
        );

        await this._rawPut(STORES.CRYPTO_KEYS, MWK_KEY, key);
        return key;
    }

    // ─── Encrypt / Decrypt Helpers ───────────────────────────────────

    /**
     * Encrypts raw bytes with the MWK using AES-GCM.
     * Returns an envelope: { iv: Uint8Array(12), ct: ArrayBuffer }
     */
    async _encrypt(plainBytes) {
        const mwk = await this._getMasterKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            mwk,
            plainBytes
        );
        return { iv, ct };
    }

    /**
     * Decrypts an envelope { iv, ct } back into a Uint8Array.
     */
    async _decrypt(envelope) {
        if (!envelope || !envelope.iv || !envelope.ct) return null;
        const mwk = await this._getMasterKey();
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: envelope.iv },
            mwk,
            envelope.ct
        );
        return new Uint8Array(plain);
    }

    /**
     * Encrypted get: reads an encrypted envelope from IndexedDB and decrypts it.
     */
    async _encGet(storeName, key) {
        const envelope = await this._rawGet(storeName, key);
        if (envelope === undefined || envelope === null) return null;
        try {
            return await this._decrypt(envelope);
        } catch (err) {
            // Do NOT silently swallow — corrupted/orphaned data is a real error.
            // Distinguish from "data not found" (returns null above) so callers
            // can detect MWK rotation or IndexedDB corruption.
            const msg = `[SignalStore] decryption failed for ${storeName}/${key} — `
                + 'data may be corrupted or the Master Wrapping Key may have changed';
            console.error(msg, err);
            throw new Error(msg);
        }
    }

    /**
     * Encrypted put: encrypts data and writes the envelope to IndexedDB.
     */
    async _encPut(storeName, key, plainBytes) {
        // Ensure we have a Uint8Array
        const bytes = plainBytes instanceof Uint8Array
            ? plainBytes
            : new Uint8Array(plainBytes);
        const envelope = await this._encrypt(bytes);
        await this._rawPut(storeName, key, envelope);
    }

    // ─── Bridge Implementation (all sensitive data encrypted) ────────

    async loadSession(address) {
        return await this._encGet(STORES.SESSIONS, address);
    }

    async storeSession(address, record) {
        if (record === null || record === undefined) {
            // null means "delete this session" (used by resetSession)
            await this._rawDelete(STORES.SESSIONS, address);
            return;
        }
        await this._encPut(STORES.SESSIONS, address, record);
    }

    async getIdentityKeyPair() {
        return await this._encGet(STORES.IDENTITIES, 'own_identity_key');
    }

    async getLocalRegistrationId() {
        // Registration ID is a plain u32, not secret key material
        return await this._rawGet(STORES.IDENTITIES, 'registration_id');
    }

    async initIdentity(identityKeyPair, registrationId) {
        await this._encPut(STORES.IDENTITIES, 'own_identity_key', identityKeyPair);
        await this._rawPut(STORES.IDENTITIES, 'registration_id', registrationId);
    }

    async saveIdentity(address, identity) {
        const existing = await this._encGet(STORES.IDENTITIES, address);
        let changed = false;

        if (existing) {
            if (existing.length !== identity.length) {
                // Different lengths → definitely changed
                changed = true;
            } else {
                // Constant-time comparison to prevent timing side-channel attacks
                let diff = 0;
                for (let i = 0; i < existing.length; i++) {
                    diff |= existing[i] ^ identity[i];
                }
                changed = diff !== 0;
            }
        }
        // If !existing → new identity, not a "change"

        await this._encPut(STORES.IDENTITIES, address, identity);
        return changed;
    }

    async isTrustedIdentity(address, identity, direction) {
        const existing = await this._encGet(STORES.IDENTITIES, address);
        if (!existing) return true; // TOFU (Trust On First Use)

        // Receiving (direction=1): always accept incoming messages.
        // The identity change will still be recorded by save_identity(),
        // allowing the UI to show a "Safety Number Changed" warning.
        if (direction === 1) return true;

        // Sending (direction=0): strict check — block if key changed.
        // The user must manually approve the new key before we encrypt to it.
        if (existing.length !== identity.length) return false;
        let diff = 0;
        for (let i = 0; i < existing.length; i++) {
            diff |= existing[i] ^ identity[i];
        }
        return diff === 0;
    }

    async getIdentity(address) {
        return await this._encGet(STORES.IDENTITIES, address);
    }

    async getPreKey(id) {
        return await this._encGet(STORES.PRE_KEYS, id);
    }

    async savePreKey(id, record) {
        await this._encPut(STORES.PRE_KEYS, id, record);
    }

    async removePreKey(id) {
        await this._rawDelete(STORES.PRE_KEYS, id);
    }

    async getSignedPreKey(id) {
        return await this._encGet(STORES.SIGNED_PRE_KEYS, id);
    }

    async saveSignedPreKey(id, record) {
        await this._encPut(STORES.SIGNED_PRE_KEYS, id, record);
    }

    async removeSignedPreKey(id) {
        await this._rawDelete(STORES.SIGNED_PRE_KEYS, id);
    }

    async getKyberPreKey(id) {
        return await this._encGet(STORES.KYBER_PRE_KEYS, id);
    }

    async saveKyberPreKey(id, record) {
        await this._encPut(STORES.KYBER_PRE_KEYS, id, record);
    }

    async removeKyberPreKey(id) {
        await this._rawDelete(STORES.KYBER_PRE_KEYS, id);
    }

    /**
     * Records a (kyber_id, ec_id, base_key) usage combo.
     * Returns false if this exact combo was already used (replay detected).
     */
    async markKyberPreKeyUsed(id, ecId, baseKey) {
        // Build a deterministic key from all three parameters
        const baseKeyHex = Array.from(new Uint8Array(baseKey))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const comboKey = `${id}:${ecId}:${baseKeyHex}`;

        const existing = await this._rawGet(STORES.KYBER_USED_COMBOS, comboKey);
        if (existing) {
            return false; // Duplicate — replay detected
        }

        await this._rawPut(STORES.KYBER_USED_COMBOS, comboKey, Date.now());
        return true;
    }

    async storeSenderKey(key, record) {
        await this._encPut(STORES.SENDER_KEYS, key, record);
    }

    async loadSenderKey(key) {
        return await this._encGet(STORES.SENDER_KEYS, key);
    }

    // ─── Local Messages ─────

    /**
     * Secures a full message object from the sender locally, encrypting only the sensitive text.
     */
    async saveLocalMessage(msgObj) {
        if (!msgObj || !msgObj.id || !msgObj.conversationId) return;

        const encoder = new TextEncoder();
        const { iv, ct } = await this._encrypt(encoder.encode(msgObj.content));

        const record = {
            id: msgObj.id,
            conversationId: msgObj.conversationId,
            senderId: msgObj.senderId,
            createdAt: msgObj.createdAt,
            contentType: msgObj.contentType,
            envelope: { iv, ct }
        };

        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.LOCAL_MESSAGES, 'readwrite');
            const store = tx.objectStore(STORES.LOCAL_MESSAGES);
            const req = store.put(record);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Retrieves and decrypts all locally sent messages for a specific conversation.
     * Fast retrieval uses DB Indices rather than scanning all message history.
     */
    async getLocalMessages(conversationId) {
        const db = await this.dbPromise;
        const records = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.LOCAL_MESSAGES, 'readonly');
            const store = tx.objectStore(STORES.LOCAL_MESSAGES);
            const index = store.index('conversationId');
            const req = index.getAll(conversationId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });

        const decoder = new TextDecoder();
        const decryptedMessages = [];

        for (const rec of records) {
            try {
                if (!rec.envelope) continue;
                const plainBytes = await this._decrypt(rec.envelope);
                const plaintext = decoder.decode(plainBytes);

                decryptedMessages.push({
                    id: rec.id,
                    conversationId: rec.conversationId,
                    senderId: rec.senderId,
                    createdAt: rec.createdAt,
                    contentType: rec.contentType,
                    content: plaintext, // restored decrypted text!
                    isDecrypted: true,
                    isLocalCache: true
                });
            } catch (err) {
                console.error(`[SignalStore] Failed to decrypt local message ${rec.id}`, err);
            }
        }

        // Ensure chronological sorting
        return decryptedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
}

export const signalStoreAdapter = new SignalStoreAdapter();

/**
 * Explicitly binds signalStoreAdapter to window.signalStorage.
 * MUST be called before WASM init — do not rely on import side effects.
 */
let _storageInitialized = false;
export function initSignalStorage() {
    if (_storageInitialized) return;
    if (window.signalStorage && window.signalStorage !== signalStoreAdapter) {
        throw new Error('window.signalStorage is already set to an unexpected object');
    }
    window.signalStorage = signalStoreAdapter;
    _storageInitialized = true;
}
