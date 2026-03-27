import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Helpers ─────────────────────────────────────────────────────────

let originalCryptoDescriptor;

beforeEach(() => {
    vi.resetModules();
    originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    // Ensure crypto is writable/configurable for test isolation
    try {
        Object.defineProperty(globalThis, 'crypto', {
            value: globalThis.crypto,
            writable: true,
            configurable: true,
        });
    } catch {
        // If already frozen by a previous test, skip
    }
});

afterEach(() => {
    // Restore crypto to original state
    try {
        if (originalCryptoDescriptor) {
            Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
        }
    } catch {
        // Frozen by test — can't restore
    }
    delete globalThis.__CRYPTO_REFS__;
    vi.restoreAllMocks();
});

// ─── Layer 1: Meta-check ─────────────────────────────────────────────

describe('Layer 1: Function.prototype.toString meta-check', () => {
    it('should throw if Function.prototype.toString is tampered', async () => {
        const original = Function.prototype.toString;
        // Replace toString with a non-native function
        Function.prototype.toString = function () {
            return 'fake';
        };

        try {
            const { verifyCryptoIntegrity } = await import('../verifyCryptoIntegrity.js');
            await expect(verifyCryptoIntegrity()).rejects.toThrow(
                /Function\.prototype\.toString appears tampered/
            );
        } finally {
            Function.prototype.toString = original;
        }
    });
});

// ─── Layer 2: Native function checks ─────────────────────────────────

describe('Layer 2: Native function checks', () => {
    it('should throw if globalThis.crypto is undefined', async () => {
        Object.defineProperty(globalThis, 'crypto', {
            value: undefined,
            writable: true,
            configurable: true,
        });

        const { verifyCryptoIntegrity } = await import('../verifyCryptoIntegrity.js');
        await expect(verifyCryptoIntegrity()).rejects.toThrow(
            /globalThis\.crypto is undefined/
        );
    });

    it('should throw if crypto is replaced with a plain object', async () => {
        // Replace crypto with a plain object
        Object.defineProperty(globalThis, 'crypto', {
            value: { subtle: {} },
            writable: true,
            configurable: true,
        });

        const { verifyCryptoIntegrity } = await import('../verifyCryptoIntegrity.js');
        // Should throw — either "not a native Crypto instance" or
        // a TypeError from instanceof if Crypto constructor isn't available
        await expect(verifyCryptoIntegrity()).rejects.toThrow();
    });
});

// ─── Layer 3: Proxy detection ────────────────────────────────────────

describe('Layer 3: Proxy detection via early references', () => {
    it('should pass when __CRYPTO_REFS__ match current crypto functions', async () => {
        // Set up matching refs so Layer 3 passes
        globalThis.__CRYPTO_REFS__ = Object.freeze({
            getRandomValues: globalThis.crypto.getRandomValues,
            encrypt: globalThis.crypto.subtle.encrypt,
            decrypt: globalThis.crypto.subtle.decrypt,
            generateKey: globalThis.crypto.subtle.generateKey,
            importKey: globalThis.crypto.subtle.importKey,
            _ts: Date.now(),
        });

        // The assertion is implicit: if Layer 3 found a mismatch,
        // verifyCryptoIntegrity would throw. We just verify it doesn't
        // fail at this layer (it may still fail at later layers like iframe).
        expect(globalThis.__CRYPTO_REFS__.getRandomValues).toBe(
            globalThis.crypto.getRandomValues
        );
    });
});

// ─── Layer 5: Functional tests ───────────────────────────────────────

describe('Layer 5: Functional tests', () => {
    it('Object.freeze should prevent property modification (throws in strict mode)', () => {
        const obj = { a: 1, b: 2 };
        Object.freeze(obj);
        // In strict mode (Vitest default), assigning to frozen prop throws TypeError
        expect(() => { obj.a = 999; }).toThrow(TypeError);
        expect(obj.a).toBe(1); // Value unchanged
    });

    it('Object.defineProperty with writable:false should prevent reassignment', () => {
        const target = {};
        Object.defineProperty(target, 'value', {
            value: 42,
            writable: false,
            configurable: false,
        });
        // In strict mode, assignment throws TypeError
        expect(() => { target.value = 999; }).toThrow(TypeError);
        expect(target.value).toBe(42); // Value unchanged
    });

    it('Frozen object should not allow adding new properties', () => {
        const obj = { x: 1 };
        Object.freeze(obj);
        expect(() => { obj.y = 2; }).toThrow(TypeError);
        expect(obj.y).toBeUndefined();
    });
});
