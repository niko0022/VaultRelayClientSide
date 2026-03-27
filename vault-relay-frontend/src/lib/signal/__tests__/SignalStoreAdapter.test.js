import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Fresh adapter for each test ─────────────────────────────────────
// We dynamically import SignalStoreAdapter so each test gets a fresh
// IndexedDB database (fake-indexeddb auto-polyfill runs in setup.js).

let SignalStoreAdapter;
let adapter;

beforeEach(async () => {
    // Reset module cache so each test starts with a clean singleton
    vi.resetModules();

    // Dynamic import to get a fresh class definition each time
    const mod = await import('../SignalStoreAdapter.js');
    SignalStoreAdapter = mod.signalStoreAdapter.constructor;
    adapter = new SignalStoreAdapter();

    // Wait for DB to be ready
    await adapter.dbPromise;
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Database Initialization ─────────────────────────────────────────

describe('Database Initialization', () => {
    it('should open IndexedDB and create all 8 object stores', async () => {
        const db = await adapter.dbPromise;
        const storeNames = Array.from(db.objectStoreNames);

        expect(storeNames).toContain('sessions');
        expect(storeNames).toContain('identities');
        expect(storeNames).toContain('preKeys');
        expect(storeNames).toContain('signedPreKeys');
        expect(storeNames).toContain('kyberPreKeys');
        expect(storeNames).toContain('senderKeys');
        expect(storeNames).toContain('cryptoKeys');
        expect(storeNames).toContain('kyberUsedCombos');
        expect(storeNames.length).toBe(8);
    });
});

// ─── Raw IndexedDB Helpers ───────────────────────────────────────────

describe('Raw IndexedDB Helpers', () => {
    it('_rawPut and _rawGet should store and retrieve values', async () => {
        await adapter._rawPut('sessions', 'test-key', 'test-value');
        const result = await adapter._rawGet('sessions', 'test-key');
        expect(result).toBe('test-value');
    });

    it('_rawGet should return undefined for missing keys', async () => {
        const result = await adapter._rawGet('sessions', 'nonexistent');
        expect(result).toBeUndefined();
    });

    it('_rawPut should overwrite existing values (upsert)', async () => {
        await adapter._rawPut('sessions', 'key', 'value-1');
        await adapter._rawPut('sessions', 'key', 'value-2');
        const result = await adapter._rawGet('sessions', 'key');
        expect(result).toBe('value-2');
    });

    it('_rawDelete should remove an existing key', async () => {
        await adapter._rawPut('sessions', 'key', 'value');
        await adapter._rawDelete('sessions', 'key');
        const result = await adapter._rawGet('sessions', 'key');
        expect(result).toBeUndefined();
    });

    it('_rawDelete should not throw for a missing key', async () => {
        await expect(adapter._rawDelete('sessions', 'nonexistent')).resolves.not.toThrow();
    });
});

// ─── Master Wrapping Key (MWK) ──────────────────────────────────────

describe('Master Wrapping Key', () => {
    it('_getMasterKey should return a CryptoKey', async () => {
        const key = await adapter._getMasterKey();
        expect(key).toBeDefined();
        expect(key.type).toBe('secret');
        expect(key.algorithm.name).toBe('AES-GCM');
        expect(key.algorithm.length).toBe(256);
    });

    it('_getMasterKey should return the same key on repeat calls (singleton)', async () => {
        const key1 = await adapter._getMasterKey();
        const key2 = await adapter._getMasterKey();
        expect(key1).toBe(key2);
    });

    it('_getMasterKey should be non-extractable', async () => {
        const key = await adapter._getMasterKey();
        expect(key.extractable).toBe(false);
    });

    it('_loadOrCreateMasterKey should persist the key to IndexedDB', async () => {
        const key = await adapter._loadOrCreateMasterKey();
        const stored = await adapter._rawGet('cryptoKeys', 'master_wrapping_key');
        expect(stored).toBeDefined();
        expect(stored.type).toBe('secret');
    });
});

// ─── Encrypt / Decrypt Round-Trip ───────────────────────────────────

describe('Encrypt / Decrypt', () => {
    it('_encrypt should return an envelope with iv and ct', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const envelope = await adapter._encrypt(data);

        expect(envelope).toHaveProperty('iv');
        expect(envelope).toHaveProperty('ct');
        expect(envelope.iv).toBeInstanceOf(Uint8Array);
        expect(envelope.iv.length).toBe(12);
        expect(envelope.ct.byteLength).toBeGreaterThan(0);
    });

    it('_decrypt should recover the original plaintext', async () => {
        const original = new Uint8Array([10, 20, 30, 40, 50]);
        const envelope = await adapter._encrypt(original);
        const decrypted = await adapter._decrypt(envelope);

        expect(decrypted).toBeInstanceOf(Uint8Array);
        expect(Array.from(decrypted)).toEqual(Array.from(original));
    });

    it('_decrypt should return null for null/undefined envelope', async () => {
        expect(await adapter._decrypt(null)).toBeNull();
        expect(await adapter._decrypt(undefined)).toBeNull();
        expect(await adapter._decrypt({})).toBeNull();
    });

    it('_encrypt should produce different IVs for the same plaintext', async () => {
        const data = new Uint8Array([1, 2, 3]);
        const env1 = await adapter._encrypt(data);
        const env2 = await adapter._encrypt(data);

        // IVs should be different (random)
        const iv1Hex = Array.from(env1.iv).map(b => b.toString(16)).join('');
        const iv2Hex = Array.from(env2.iv).map(b => b.toString(16)).join('');
        expect(iv1Hex).not.toBe(iv2Hex);
    });
});

// ─── Encrypted Get / Put ─────────────────────────────────────────────

describe('Encrypted Get / Put (_encGet / _encPut)', () => {
    it('should encrypt-store and decrypt-retrieve data', async () => {
        const data = new Uint8Array([100, 200, 50, 75]);
        await adapter._encPut('preKeys', 42, data);
        const result = await adapter._encGet('preKeys', 42);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(Array.from(result)).toEqual([100, 200, 50, 75]);
    });

    it('_encGet should return null for missing keys', async () => {
        const result = await adapter._encGet('preKeys', 999);
        expect(result).toBeNull();
    });

    it('_encGet should throw on corrupted data (not silently return null)', async () => {
        // Store a malformed envelope directly (bypassing encryption)
        await adapter._rawPut('preKeys', 'corrupted', {
            iv: new Uint8Array(12),
            ct: new ArrayBuffer(16)
        });

        await expect(adapter._encGet('preKeys', 'corrupted')).rejects.toThrow(
            /decryption failed/
        );
    });

    it('_encPut should accept ArrayBuffer in addition to Uint8Array', async () => {
        const buffer = new ArrayBuffer(4);
        const view = new Uint8Array(buffer);
        view.set([11, 22, 33, 44]);

        // Pass raw ArrayBuffer — _encPut should coerce it
        await adapter._encPut('preKeys', 'ab-test', buffer);
        const result = await adapter._encGet('preKeys', 'ab-test');
        expect(Array.from(result)).toEqual([11, 22, 33, 44]);
    });
});

// ─── Session Store ───────────────────────────────────────────────────

describe('Session Store', () => {
    it('loadSession should return null for unknown address', async () => {
        const result = await adapter.loadSession('unknown.1');
        expect(result).toBeNull();
    });

    it('storeSession + loadSession round-trip', async () => {
        const sessionData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        await adapter.storeSession('Alice.1', sessionData);
        const loaded = await adapter.loadSession('Alice.1');

        expect(Array.from(loaded)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('storeSession(null) should delete the session', async () => {
        const sessionData = new Uint8Array([1, 2, 3]);
        await adapter.storeSession('Bob.1', sessionData);

        // Verify stored
        expect(await adapter.loadSession('Bob.1')).not.toBeNull();

        // Delete via null
        await adapter.storeSession('Bob.1', null);
        expect(await adapter.loadSession('Bob.1')).toBeNull();
    });

    it('storeSession(undefined) should also delete the session', async () => {
        await adapter.storeSession('Charlie.1', new Uint8Array([9, 8, 7]));
        expect(await adapter.loadSession('Charlie.1')).not.toBeNull();
        await adapter.storeSession('Charlie.1', undefined);
        expect(await adapter.loadSession('Charlie.1')).toBeNull();
    });
});

// ─── Identity Store ──────────────────────────────────────────────────

describe('Identity Store', () => {
    it('initIdentity stores encrypted key pair and plain registration ID', async () => {
        const fakeKeyPair = new Uint8Array([10, 20, 30, 40, 50, 60]);
        await adapter.initIdentity(fakeKeyPair, 12345);

        const keyPair = await adapter.getIdentityKeyPair();
        expect(Array.from(keyPair)).toEqual([10, 20, 30, 40, 50, 60]);

        const regId = await adapter.getLocalRegistrationId();
        expect(regId).toBe(12345);
    });

    it('getLocalRegistrationId returns plain (unencrypted) value', async () => {
        await adapter._rawPut('identities', 'registration_id', 9999);
        const result = await adapter.getLocalRegistrationId();
        expect(result).toBe(9999);
    });

    it('saveIdentity returns false for a new identity', async () => {
        const identity = new Uint8Array([1, 2, 3, 4, 5]);
        const changed = await adapter.saveIdentity('Alice.1', identity);
        expect(changed).toBe(false);
    });

    it('saveIdentity returns false when identity is identical', async () => {
        const identity = new Uint8Array([1, 2, 3, 4, 5]);
        await adapter.saveIdentity('Alice.1', identity);
        const changed = await adapter.saveIdentity('Alice.1', identity);
        expect(changed).toBe(false);
    });

    it('saveIdentity returns true when identity changes', async () => {
        const old = new Uint8Array([1, 2, 3, 4, 5]);
        const newKey = new Uint8Array([5, 4, 3, 2, 1]);
        await adapter.saveIdentity('Alice.1', old);
        const changed = await adapter.saveIdentity('Alice.1', newKey);
        expect(changed).toBe(true);
    });

    it('saveIdentity returns true when identity changes length', async () => {
        const old = new Uint8Array([1, 2, 3]);
        const newKey = new Uint8Array([1, 2, 3, 4, 5]);
        await adapter.saveIdentity('Alice.1', old);
        const changed = await adapter.saveIdentity('Alice.1', newKey);
        expect(changed).toBe(true);
    });

    it('getIdentity should return stored identity', async () => {
        const identity = new Uint8Array([11, 22, 33]);
        await adapter.saveIdentity('Dave.1', identity);
        const result = await adapter.getIdentity('Dave.1');
        expect(Array.from(result)).toEqual([11, 22, 33]);
    });
});

// ─── Trust Verification ─────────────────────────────────────────────

describe('isTrustedIdentity', () => {
    it('returns true for unknown address (TOFU)', async () => {
        const identity = new Uint8Array([1, 2, 3]);
        const trusted = await adapter.isTrustedIdentity('NewPerson.1', identity, 0);
        expect(trusted).toBe(true);
    });

    it('returns true for same key when sending (direction=0)', async () => {
        const identity = new Uint8Array([1, 2, 3, 4, 5]);
        await adapter.saveIdentity('Alice.1', identity);
        const trusted = await adapter.isTrustedIdentity('Alice.1', identity, 0);
        expect(trusted).toBe(true);
    });

    it('returns false for different key when sending (direction=0)', async () => {
        const old = new Uint8Array([1, 2, 3, 4, 5]);
        const newKey = new Uint8Array([5, 4, 3, 2, 1]);
        await adapter.saveIdentity('Alice.1', old);
        const trusted = await adapter.isTrustedIdentity('Alice.1', newKey, 0);
        expect(trusted).toBe(false);
    });

    it('returns true for different key when receiving (direction=1)', async () => {
        const old = new Uint8Array([1, 2, 3, 4, 5]);
        const newKey = new Uint8Array([5, 4, 3, 2, 1]);
        await adapter.saveIdentity('Alice.1', old);
        const trusted = await adapter.isTrustedIdentity('Alice.1', newKey, 1);
        expect(trusted).toBe(true);
    });

    it('returns false for different length key when sending', async () => {
        const old = new Uint8Array([1, 2, 3]);
        const newKey = new Uint8Array([1, 2, 3, 4, 5]);
        await adapter.saveIdentity('Alice.1', old);
        const trusted = await adapter.isTrustedIdentity('Alice.1', newKey, 0);
        expect(trusted).toBe(false);
    });
});

// ─── PreKey Store ────────────────────────────────────────────────────

describe('PreKey Store', () => {
    it('savePreKey + getPreKey round-trip', async () => {
        const record = new Uint8Array([99, 88, 77, 66]);
        await adapter.savePreKey(42, record);
        const result = await adapter.getPreKey(42);
        expect(Array.from(result)).toEqual([99, 88, 77, 66]);
    });

    it('getPreKey returns null for missing key', async () => {
        const result = await adapter.getPreKey(999);
        expect(result).toBeNull();
    });

    it('removePreKey deletes the key', async () => {
        await adapter.savePreKey(42, new Uint8Array([1, 2, 3]));
        await adapter.removePreKey(42);
        expect(await adapter.getPreKey(42)).toBeNull();
    });
});

// ─── Signed PreKey Store ─────────────────────────────────────────────

describe('Signed PreKey Store', () => {
    it('saveSignedPreKey + getSignedPreKey round-trip', async () => {
        const record = new Uint8Array([11, 22, 33]);
        await adapter.saveSignedPreKey(1, record);
        const result = await adapter.getSignedPreKey(1);
        expect(Array.from(result)).toEqual([11, 22, 33]);
    });

    it('removeSignedPreKey deletes the key', async () => {
        await adapter.saveSignedPreKey(1, new Uint8Array([1]));
        await adapter.removeSignedPreKey(1);
        expect(await adapter.getSignedPreKey(1)).toBeNull();
    });
});

// ─── Kyber PreKey Store ──────────────────────────────────────────────

describe('Kyber PreKey Store', () => {
    it('saveKyberPreKey + getKyberPreKey round-trip', async () => {
        const record = new Uint8Array([44, 55, 66]);
        await adapter.saveKyberPreKey(1, record);
        const result = await adapter.getKyberPreKey(1);
        expect(Array.from(result)).toEqual([44, 55, 66]);
    });

    it('removeKyberPreKey deletes the key', async () => {
        await adapter.saveKyberPreKey(1, new Uint8Array([1]));
        await adapter.removeKyberPreKey(1);
        expect(await adapter.getKyberPreKey(1)).toBeNull();
    });
});

// ─── Kyber Replay Detection ─────────────────────────────────────────

describe('markKyberPreKeyUsed (Replay Detection)', () => {
    it('returns true on first use', async () => {
        const baseKey = new Uint8Array([1, 2, 3, 4, 5]);
        const result = await adapter.markKyberPreKeyUsed(1, 42, baseKey);
        expect(result).toBe(true);
    });

    it('returns false on duplicate use (replay detected)', async () => {
        const baseKey = new Uint8Array([1, 2, 3, 4, 5]);
        await adapter.markKyberPreKeyUsed(1, 42, baseKey);
        const result = await adapter.markKyberPreKeyUsed(1, 42, baseKey);
        expect(result).toBe(false);
    });

    it('returns true for different base keys (not a replay)', async () => {
        const baseKey1 = new Uint8Array([1, 2, 3]);
        const baseKey2 = new Uint8Array([4, 5, 6]);
        expect(await adapter.markKyberPreKeyUsed(1, 42, baseKey1)).toBe(true);
        expect(await adapter.markKyberPreKeyUsed(1, 42, baseKey2)).toBe(true);
    });

    it('returns true for different kyber IDs', async () => {
        // Use unique values that won't collide with earlier tests
        const baseKey = new Uint8Array([99, 98, 97]);
        expect(await adapter.markKyberPreKeyUsed(100, 200, baseKey)).toBe(true);
        expect(await adapter.markKyberPreKeyUsed(101, 200, baseKey)).toBe(true);
    });
});

// ─── Sender Key Store ────────────────────────────────────────────────

describe('Sender Key Store', () => {
    it('storeSenderKey + loadSenderKey round-trip', async () => {
        const record = new Uint8Array([77, 88, 99]);
        await adapter.storeSenderKey('Alice.1:group-uuid', record);
        const result = await adapter.loadSenderKey('Alice.1:group-uuid');
        expect(Array.from(result)).toEqual([77, 88, 99]);
    });

    it('loadSenderKey returns null for missing key', async () => {
        const result = await adapter.loadSenderKey('nonexistent');
        expect(result).toBeNull();
    });
});

// ─── initSignalStorage ───────────────────────────────────────────────

describe('initSignalStorage', () => {
    it('should bind signalStoreAdapter to window.signalStorage', async () => {
        const mod = await import('../SignalStoreAdapter.js');
        // Clean up any previous binding
        delete globalThis.signalStorage;

        mod.initSignalStorage();
        expect(globalThis.signalStorage).toBeDefined();
        expect(globalThis.signalStorage).toBe(mod.signalStoreAdapter);
    });
});
