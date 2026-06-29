import { uint8ArrayToBase64, base64ToUint8Array } from './signalUtils';

/**
 * Generates an ephemeral ECDH keypair for the device pairing/linking handshake.
 */
export async function generateProvisioningKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );
    const rawPubKey = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64 = uint8ArrayToBase64(new Uint8Array(rawPubKey));

    return {
        privateKey: keyPair.privateKey,
        publicKeyBase64
    };
}

/**
 * Derives a shared AES-GCM-256 key from our ephemeral private key and the peer's public key.
 */
export async function deriveSharedKey(ourPrivateKey, peerPublicKeyBase64) {
    const peerPubKeyBytes = base64ToUint8Array(peerPublicKeyBase64);
    const peerPublicKey = await window.crypto.subtle.importKey(
        "raw",
        peerPubKeyBytes,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    return await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: peerPublicKey },
        ourPrivateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a provisioning payload using the derived AES key.
 */
export async function encryptPayload(aesKey, payload) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(payload));

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        dataBytes
    );

    return {
        iv: uint8ArrayToBase64(iv),
        ct: uint8ArrayToBase64(new Uint8Array(ciphertext))
    };
}

/**
 * Decrypts a provisioning payload using the derived AES key.
 */
export async function decryptPayload(aesKey, encryptedData) {
    const iv = base64ToUint8Array(encryptedData.iv);
    const ct = base64ToUint8Array(encryptedData.ct);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        ct
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
}
