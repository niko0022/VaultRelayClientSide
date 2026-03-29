import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Hoisted mock functions ─────────────────────────────────────────
// vi.hoisted() runs before vi.mock hoisting, solving the reference issue.
const {
    mockFree,
    mockLoadSession,
    mockStoreSession,
    mockGetIdentityKeyPair,
    mockGetLocalRegistrationId,
    mockSavePreKey,
    mockSaveSignedPreKey,
    mockSaveKyberPreKey,
} = vi.hoisted(() => ({
    mockFree: vi.fn(),
    mockLoadSession: vi.fn().mockResolvedValue(null),
    mockStoreSession: vi.fn().mockResolvedValue(undefined),
    mockGetIdentityKeyPair: vi.fn().mockResolvedValue(new Uint8Array(64)),
    mockGetLocalRegistrationId: vi.fn().mockResolvedValue(1234),
    mockSavePreKey: vi.fn().mockResolvedValue(undefined),
    mockSaveSignedPreKey: vi.fn().mockResolvedValue(undefined),
    mockSaveKyberPreKey: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock WASM imports ──────────────────────────────────────────────
vi.mock('signal-wasm-bridge', () => {
    const free = mockFree;
    return {
        default: vi.fn().mockResolvedValue(undefined),
        SessionCipher: vi.fn().mockImplementation(function () {
            this.encrypt = vi.fn().mockResolvedValue({ type: 3, body: new Uint8Array([1, 2, 3]) });
            this.decrypt = vi.fn().mockResolvedValue(new Uint8Array([72, 101, 108, 108, 111]));
            this.free = free;
        }),
        SessionBuilder: vi.fn().mockImplementation(function () {
            this.processPreKeyBundleWithKyber = vi.fn().mockResolvedValue(undefined);
            this.free = free;
        }),
        SignalProtocolAddress: vi.fn().mockImplementation(function (name, deviceId) {
            this.name = name;
            this.deviceId = deviceId;
            this.free = free;
        }),
        initIdentity: vi.fn().mockResolvedValue({
            identityKeyPair: new Uint8Array(32),
            registrationId: 1234,
        }),
        generatePreKeys: vi.fn().mockReturnValue([
            { id: 1, record: new Uint8Array(10), publicKey: new Uint8Array(33) },
            { id: 2, record: new Uint8Array(10), publicKey: new Uint8Array(33) },
        ]),
        generateSignedPreKey: vi.fn().mockReturnValue({
            id: 1, record: new Uint8Array(10), publicKey: new Uint8Array(33), signature: new Uint8Array(64),
        }),
        generateKyberPreKey: vi.fn().mockReturnValue({
            id: 1, record: new Uint8Array(10), publicKey: new Uint8Array(1568), signature: new Uint8Array(64),
        }),
        extractIdentityPublicKey: vi.fn().mockReturnValue(new Uint8Array(33)),
    };
});

// ─── Mock verifyCryptoIntegrity ─────────────────────────────────────
vi.mock('../../lib/signal/verifyCryptoIntegrity.js', () => ({
    verifyCryptoIntegrity: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock SignalStoreAdapter ────────────────────────────────────────
vi.mock('../../lib/signal/SignalStoreAdapter.js', () => ({
    signalStoreAdapter: {
        loadSession: mockLoadSession,
        storeSession: mockStoreSession,
        getIdentityKeyPair: mockGetIdentityKeyPair,
        getLocalRegistrationId: mockGetLocalRegistrationId,
        savePreKey: mockSavePreKey,
        saveSignedPreKey: mockSaveSignedPreKey,
        saveKyberPreKey: mockSaveKyberPreKey,
    },
    initSignalStorage: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────────────
import { useSignalSession } from '../useSignalSession.js';

beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSession.mockResolvedValue(null);
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Hook Initialization ────────────────────────────────────────────

describe('Hook Initialization', () => {
    it('should set isReady=true after WASM init', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));
    });

    it('should set hasSession=false when no existing session found', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));
        expect(result.current.hasSession).toBe(false);
    });

    it('should set hasSession=true when existing session is found', async () => {
        mockLoadSession.mockResolvedValue(new Uint8Array([1, 2, 3]));
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.hasSession).toBe(true));
    });

    it('should set error if WASM init fails', async () => {
        const initMod = await import('signal-wasm-bridge');
        initMod.default.mockRejectedValueOnce(new Error('WASM load failed'));

        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.error).toBeTruthy());
        expect(result.current.error.message).toBe('WASM load failed');
    });
});

// ─── Cleanup ─────────────────────────────────────────────────────────

describe('Hook Cleanup', () => {
    it('should call .free() on WASM objects when unmounted', async () => {
        mockLoadSession.mockResolvedValue(new Uint8Array([1, 2, 3]));
        const { result, unmount } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.hasSession).toBe(true));

        mockFree.mockClear();
        unmount();
        expect(mockFree).toHaveBeenCalled();
    });
});

// ─── establishSession ────────────────────────────────────────────────

describe('establishSession', () => {
    const mockBase64 = globalThis.btoa ? globalThis.btoa('\x00'.repeat(33)) : Buffer.from(new Uint8Array(33)).toString('base64');
    
    const mockBundle = {
        registrationId: 5678,
        identityKey: mockBase64,
        oneTimePreKey: { keyId: 42, publicKey: mockBase64 },
        signedPreKey: { keyId: 1, publicKey: mockBase64, signature: mockBase64 },
        kyberPreKey: { keyId: 1, publicKey: mockBase64, signature: mockBase64 },
    };

    it('should establish session and set hasSession=true', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));

        await act(async () => {
            await result.current.establishSession(mockBundle);
        });

        expect(result.current.hasSession).toBe(true);
    });

    it('should throw if session already exists', async () => {
        mockLoadSession.mockResolvedValue(new Uint8Array([1]));
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.hasSession).toBe(true));

        await expect(async () => {
            await act(async () => {
                await result.current.establishSession(mockBundle);
            });
        }).rejects.toThrow(/Session already established/);
    });
});

// ─── resetSession ────────────────────────────────────────────────────

describe('resetSession', () => {
    it('should reset hasSession to false and delete session from store', async () => {
        mockLoadSession.mockResolvedValue(new Uint8Array([1]));
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.hasSession).toBe(true));

        await act(async () => {
            await result.current.resetSession();
        });

        expect(result.current.hasSession).toBe(false);
        expect(mockStoreSession).toHaveBeenCalledWith('Alice.1', null);
    });
});

// ─── encryptMessage / decryptMessage ─────────────────────────────────

describe('encryptMessage', () => {
    it('should throw without an active session', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));

        await expect(async () => {
            await act(async () => {
                await result.current.encryptMessage('Hello');
            });
        }).rejects.toThrow(/No session/);
    });

    it('should successfully encrypt a message when session exists', async () => {
        mockLoadSession.mockResolvedValue(new Uint8Array([1])); // Fake existing session
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.hasSession).toBe(true));

        let encrypted;
        await act(async () => {
            encrypted = await result.current.encryptMessage('Hello World');
        });

        // Our fake SessionCipher always returns type:3 and body:[1,2,3]
        expect(encrypted).toBeDefined();
        expect(encrypted.type).toBe(3);
        expect(Array.from(encrypted.body)).toEqual([1, 2, 3]);
    });
});

describe('decryptMessage', () => {
    it('should throw without an active session', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));

        await expect(async () => {
            await act(async () => {
                await result.current.decryptMessage({ type: 3, body: new Uint8Array([1]) });
            });
        }).rejects.toThrow(/No session/);
    });

    it('should successfully decrypt a message when session exists', async () => {
        mockLoadSession.mockResolvedValue(new Uint8Array([1]));
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.hasSession).toBe(true));

        let decrypted;
        await act(async () => {
            decrypted = await result.current.decryptMessage({ type: 3, body: new Uint8Array([1]) });
        });

        // Our fake SessionCipher always decrypts to [72, 101, 108, 108, 111] ("Hello")
        expect(decrypted).toBe('Hello');
    });
});

// ─── generatePreKeyBundle ────────────────────────────────────────────

describe('generatePreKeyBundle', () => {
    it('should return only public keys (no private records)', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));

        let bundle;
        await act(async () => {
            bundle = await result.current.generatePreKeyBundle();
        });

        expect(bundle).toBeDefined();
        expect(bundle.registrationId).toBe(1234);
        expect(typeof bundle.identityKey).toBe('string');
        expect(bundle.oneTimePreKeys).toHaveLength(2);
        expect(bundle.oneTimePreKeys[0]).toHaveProperty('keyId');
        expect(bundle.oneTimePreKeys[0]).toHaveProperty('publicKey');
        expect(typeof bundle.oneTimePreKeys[0].publicKey).toBe('string');
        expect(bundle.oneTimePreKeys[0]).not.toHaveProperty('record');
        expect(bundle.signedPreKey).toHaveProperty('signature');
        expect(typeof bundle.signedPreKey.signature).toBe('string');
        expect(bundle.signedPreKey).not.toHaveProperty('record');
        expect(bundle.kyberPreKey).toHaveProperty('signature');
        expect(typeof bundle.kyberPreKey.signature).toBe('string');
        expect(bundle.kyberPreKey).not.toHaveProperty('record');
    });
});

// ─── replenishPreKeys ────────────────────────────────────────────────

describe('replenishPreKeys', () => {
    it('should return null when above threshold', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));

        let keys;
        await act(async () => {
            keys = await result.current.replenishPreKeys({
                currentCount: 50,
                nextStartId: 101,
                threshold: 25,
            });
        });

        expect(keys).toBeNull();
    });

    it('should generate new keys when below threshold', async () => {
        const { result } = renderHook(() => useSignalSession('Alice', '1'));
        await waitFor(() => expect(result.current.isReady).toBe(true));

        let keys;
        await act(async () => {
            keys = await result.current.replenishPreKeys({
                currentCount: 10,
                nextStartId: 101,
                threshold: 25,
            });
        });

        expect(keys).not.toBeNull();
        expect(keys.length).toBeGreaterThan(0);
        expect(keys[0]).toHaveProperty('keyId');
        expect(typeof keys[0].publicKey).toBe('string');
    });
});
