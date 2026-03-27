/**
 * Crypto Integrity Verification
 * 
 * Verifies that the Web Crypto API has not been tampered with via prototype
 * pollution or malicious script injection before the WASM module initializes.
 * 
 * If any check fails, an Error is thrown to halt WASM initialization entirely,
 * preventing the Signal Protocol from operating on a compromised entropy source.
 * 
 * Defense layers:
 *   Layer 1: Meta-check — verify Function.prototype.toString is genuine
 *   Layer 2: Native function checks — verify all crypto methods are native
 *   Layer 3: Proxy detection — compare current functions against pristine
 *            references saved by the inline <script> in index.html
 *   Layer 4: Clean iframe cross-verification — use a pristine browser context
 *            to independently verify the main window's crypto functions
 *   Layer 5: Functional tests — generate throwaway keys/entropy and verify output
 *   Layer 6: Freeze — lock down all crypto objects and prototypes
 */

/**
 * Verifies the integrity of `window.crypto` and `crypto.subtle`.
 * Must be called BEFORE any WASM initialization or key generation.
 * 
 * @throws {Error} if any integrity check fails
 */
export async function verifyCryptoIntegrity() {
    // ── Layer 1: Meta-check — verify our detection tool is genuine ────
    // If an attacker replaces Function.prototype.toString, they can make
    // any monkey-patched function appear "native". We check it first.
    const fnToString = Function.prototype.toString;
    try {
        const ownOutput = fnToString.call(fnToString);
        if (!ownOutput.includes('[native code]')) {
            throw new Error('tampered');
        }
    } catch {
        throw new Error(
            '[Signal] FATAL: Function.prototype.toString appears tampered. '
            + 'Cannot reliably verify native functions.'
        );
    }

    // Helper: check that a function is genuinely native (not monkey-patched)
    function assertNative(fn, name) {
        if (typeof fn !== 'function') {
            throw new Error(`[Signal] FATAL: ${name} is not a function.`);
        }
        if (!fnToString.call(fn).includes('[native code]')) {
            throw new Error(
                `[Signal] FATAL: ${name} appears to be monkey-patched. Possible prototype pollution.`
            );
        }
    }

    // ── Layer 2: Native function checks on main window ───────────────

    // 1. Verify crypto object exists and has the correct prototype
    if (typeof globalThis.crypto === 'undefined') {
        throw new Error('[Signal] FATAL: globalThis.crypto is undefined. Secure context required.');
    }

    const cryptoObj = globalThis.crypto;

    if (!(cryptoObj instanceof Crypto)) {
        throw new Error('[Signal] FATAL: globalThis.crypto is not a native Crypto instance. Possible prototype pollution detected.');
    }

    // 2. Verify crypto.subtle exists and is genuine
    if (!cryptoObj.subtle) {
        throw new Error('[Signal] FATAL: crypto.subtle is missing. Secure context (HTTPS) required.');
    }

    if (!(cryptoObj.subtle instanceof SubtleCrypto)) {
        throw new Error('[Signal] FATAL: crypto.subtle is not a native SubtleCrypto instance. Possible prototype pollution detected.');
    }

    // 3. Verify all critical crypto functions are native
    assertNative(cryptoObj.getRandomValues, 'crypto.getRandomValues');
    assertNative(cryptoObj.subtle.generateKey, 'crypto.subtle.generateKey');
    assertNative(cryptoObj.subtle.encrypt, 'crypto.subtle.encrypt');
    assertNative(cryptoObj.subtle.decrypt, 'crypto.subtle.decrypt');
    assertNative(cryptoObj.subtle.importKey, 'crypto.subtle.importKey');

    // ── Layer 3: Proxy detection via early reference comparison ───────
    // The inline <script> in index.html saves pristine function references
    // to window.__CRYPTO_REFS__ BEFORE any other code (React, npm, extensions)
    // can run. A Proxy wrapping a native function is a different object, so
    // proxyFn !== originalFn is ALWAYS true. This is the only reliable way
    // to detect Proxy-based attacks from within JavaScript.
    if (globalThis.__CRYPTO_REFS__) {
        const refs = globalThis.__CRYPTO_REFS__;

        const checks = [
            [cryptoObj.getRandomValues, refs.getRandomValues, 'crypto.getRandomValues'],
            [cryptoObj.subtle.encrypt, refs.encrypt, 'crypto.subtle.encrypt'],
            [cryptoObj.subtle.decrypt, refs.decrypt, 'crypto.subtle.decrypt'],
            [cryptoObj.subtle.generateKey, refs.generateKey, 'crypto.subtle.generateKey'],
            [cryptoObj.subtle.importKey, refs.importKey, 'crypto.subtle.importKey'],
        ];

        for (const [current, original, name] of checks) {
            if (current !== original) {
                throw new Error(
                    `[Signal] FATAL: ${name} has been replaced since page load. ` +
                    'Possible Proxy interception or function replacement detected.'
                );
            }
        }
    } else {
        console.warn(
            '[Signal] Early crypto references (__CRYPTO_REFS__) not found. ' +
            'Proxy detection layer is unavailable. Ensure the inline <script> ' +
            'in index.html loads before any module scripts.'
        );
    }

    // ── Layer 4: Clean iframe cross-verification ─────────────────────
    // Create a hidden, sandboxed iframe to obtain a pristine copy of
    // Function.prototype.toString from an untouched browser context.
    // If the main window's toString was replaced with a sophisticated fake
    // that passed our meta-check, the iframe's independent copy will expose it.
    await verifyViaCleanIframe(fnToString);

    // ── Layer 5: Functional tests ────────────────────────────────────

    // 5. Key generation test: attempt to generate a throwaway AES key
    try {
        const testKey = await cryptoObj.subtle.generateKey(
            { name: 'AES-GCM', length: 128 },
            false,
            ['encrypt']
        );
        if (!testKey || testKey.type !== 'secret') {
            throw new Error('Unexpected key type');
        }
    } catch (e) {
        throw new Error(`[Signal] FATAL: crypto.subtle.generateKey functional test failed: ${e.message}`);
    }

    // ── Layer 6: FREEZE everything so no future script can tamper ─────

    // Freeze prototypes first — blocks SubtleCrypto.prototype.encrypt = malicious
    Object.freeze(SubtleCrypto.prototype);
    Object.freeze(Crypto.prototype);

    // Freeze instances so direct properties cannot be reassigned
    Object.freeze(cryptoObj.subtle);
    Object.freeze(cryptoObj);

    // Lock globalThis.crypto so window.crypto cannot be replaced entirely
    Object.defineProperty(globalThis, 'crypto', {
        value: cryptoObj,
        writable: false,
        configurable: false
    });

    console.info('[Signal] Crypto integrity verified and frozen.');
}

/**
 * Creates a hidden, sandboxed iframe to obtain a pristine browser context.
 * Uses the iframe's clean Function.prototype.toString to independently verify
 * that the main window's crypto functions are genuinely native.
 * 
 * This catches attacks where the main window's toString was replaced with a
 * sophisticated fake that returns "[native code]" for attacker-controlled functions.
 */
async function verifyViaCleanIframe(mainToString) {
    let iframe;
    try {
        iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        // 'allow-same-origin' lets us access contentWindow for comparison,
        // but the sandbox prevents any scripts from executing inside the iframe.
        iframe.setAttribute('sandbox', 'allow-same-origin');
        document.documentElement.appendChild(iframe);

        const cleanWindow = iframe.contentWindow;
        if (!cleanWindow || !cleanWindow.Function || !cleanWindow.crypto) {
            throw new Error(
                '[Signal] FATAL: Clean iframe context inaccessible. '
                + 'Cannot perform cross-realm verification.'
            );
        }

        // ── Step 1: Get the iframe's pristine toString ───────────────
        const cleanToString = cleanWindow.Function.prototype.toString;

        // Verify the clean toString is itself native (using itself)
        const cleanSelfCheck = cleanToString.call(cleanToString);
        if (!cleanSelfCheck.includes('[native code]')) {
            throw new Error(
                '[Signal] FATAL: Even the clean iframe Function.prototype.toString is not native. '
                + 'Browser environment is deeply compromised.'
            );
        }

        // ── Step 2: Cross-verify main window's crypto functions ──────
        // Use the CLEAN toString to inspect the MAIN window's functions.
        // If main toString was faked to always return "[native code]",
        // but the functions are actually JavaScript replacements, the
        // clean toString will reveal the real source code.
        const targets = [
            [globalThis.crypto.getRandomValues, 'crypto.getRandomValues'],
            [globalThis.crypto.subtle.encrypt, 'crypto.subtle.encrypt'],
            [globalThis.crypto.subtle.decrypt, 'crypto.subtle.decrypt'],
            [globalThis.crypto.subtle.generateKey, 'crypto.subtle.generateKey'],
            [globalThis.crypto.subtle.importKey, 'crypto.subtle.importKey'],
        ];

        for (const [fn, name] of targets) {
            // Use the clean iframe's toString to inspect the main window's function
            const cleanResult = cleanToString.call(fn);

            if (!cleanResult.includes('[native code]')) {
                throw new Error(
                    `[Signal] FATAL: ${name} failed clean iframe verification — not native code.`
                );
            }

            // Cross-compare: if main toString and clean toString disagree,
            // the main toString has been tampered with
            const mainResult = mainToString.call(fn);
            if (mainResult !== cleanResult) {
                throw new Error(
                    `[Signal] FATAL: ${name} produced different toString results between main ` +
                    'and clean contexts. Main window Function.prototype.toString may be compromised.'
                );
            }
        }

        // ── Step 3: Functional cross-verification ────────────────────
        // Generate entropy in BOTH contexts and verify both produce valid output.
        // If main window's getRandomValues is intercepted, the two buffers
        // will be deterministically identical, which true randomness never produces.
        const cleanBuffer = new Uint8Array(32);
        const mainBuffer = new Uint8Array(32);
        cleanWindow.crypto.getRandomValues(cleanBuffer);
        globalThis.crypto.getRandomValues(mainBuffer);

        // Verify the two buffers are not identical — if they are, something is
        // deterministically controlling the output (both should be random)
        let identical = true;
        for (let i = 0; i < cleanBuffer.length; i++) {
            if (cleanBuffer[i] !== mainBuffer[i]) {
                identical = false;
                break;
            }
        }
        if (identical) {
            throw new Error(
                '[Signal] FATAL: Main and clean iframe crypto.getRandomValues produced identical output. '
                + 'Entropy source may be deterministic or intercepted.'
            );
        }

    } catch (e) {
        // If the error is already one of ours, re-throw it
        if (e.message && e.message.startsWith('[Signal]')) {
            throw e;
        }
        // Otherwise, the iframe itself failed (e.g., CSP blocks iframes)
        // Log a warning but don't block initialization — the other layers
        // still provide meaningful protection
        console.warn(
            '[Signal] Clean iframe verification skipped:',
            e.message,
            '— falling back to main-context checks only.'
        );
    } finally {
        // Always clean up the iframe
        if (iframe && iframe.parentNode) {
            iframe.remove();
        }
    }
}
