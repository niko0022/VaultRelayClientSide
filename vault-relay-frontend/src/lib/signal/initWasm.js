import { initSignalStorage, signalStoreAdapter } from './SignalStoreAdapter';
import { verifyCryptoIntegrity } from './verifyCryptoIntegrity';

/**
 * Singleton WASM initializer.
 *
 * The caller MUST pass the `init` and `initIdentity` functions
 * from their own `import ... from 'signal-wasm-bridge'` statement.
 *
 * Why: Vite can resolve a `file:`-linked package to separate module
 * instances when imported from different directories. By requiring
 * the caller to pass `init`, we guarantee the WASM binary is loaded
 * into the exact same module instance that owns SignalProtocolAddress,
 * SessionCipher, etc.
 */
let wasmInitPromise = null;

export function ensureWasmReady(init, initIdentity) {
    if (!wasmInitPromise) {
        wasmInitPromise = (async () => {
            await verifyCryptoIntegrity();
            initSignalStorage();
            await init();
            await initIdentity();
            await uploadKeysIfNeeded();
        })();
    }
    return wasmInitPromise;
}

/**
 * Checks if the server already has our keys uploaded.
 * If not (fresh device / first login), generates a full pre-key bundle and uploads it.
 * Runs at most once per session thanks to the singleton above.
 */
async function uploadKeysIfNeeded() {
    try {
        const { chatService } = await import('../../services/chatService');
        const { uint8ArrayToBase64 } = await import('./signalUtils');

        const identityKeyPairBytes = await signalStoreAdapter.getIdentityKeyPair();
        const localRegId = await signalStoreAdapter.getLocalRegistrationId();

        if (!identityKeyPairBytes || localRegId == null) {
            console.warn('[initWasm] Identity not initialized — skipping key upload.');
            return;
        }

        // Check if server already has keys for us AND the server's registration ID matches our local one
        const { count, registrationId: serverRegId } = await chatService.getPreKeyCount();
        if (count > 0 && serverRegId === localRegId) {
            return; // Server is perfectly in sync with this device
        }

        console.log('[initWasm] Keys missing or device wiped. Generating fresh PreKey bundle...');

        // Dynamically import key generation functions from the same WASM module
        const {
            generatePreKeys,
            generateSignedPreKey,
            generateKyberPreKey,
            extractIdentityPublicKey
        } = await import('signal-wasm-bridge');

        // Generate keys
        const preKeys = generatePreKeys(1, 100);
        const spk = generateSignedPreKey(identityKeyPairBytes, 1);
        const kpk = generateKyberPreKey(identityKeyPairBytes, 1);

        // Save private records locally
        for (const pk of preKeys) {
            await signalStoreAdapter.savePreKey(pk.id, pk.record);
        }
        await signalStoreAdapter.saveSignedPreKey(spk.id, spk.record);
        await signalStoreAdapter.saveKyberPreKey(kpk.id, kpk.record);

        // Upload public keys to server
        const identityPublicKey = extractIdentityPublicKey(identityKeyPairBytes);

        await chatService.uploadKeys({
            registrationId: localRegId,
            identityKey: uint8ArrayToBase64(identityPublicKey),
            oneTimePreKeys: preKeys.map(pk => ({
                keyId: pk.id,
                publicKey: uint8ArrayToBase64(pk.publicKey)
            })),
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
        });

        console.log('[initWasm] Pre-key bundle uploaded to server successfully.');
    } catch (err) {
        console.error('[initWasm] Failed to upload keys — others cannot message you:', err);
    }
}
