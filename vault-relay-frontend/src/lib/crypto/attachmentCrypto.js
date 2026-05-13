/**
 * Attachment Encryption/Decryption using AES-256-GCM (Web Crypto API).
 * 
 * This module encrypts files client-side BEFORE uploading to S3,
 * ensuring the storage provider can never read file contents.
 * The AES key is delivered to recipients via Signal Protocol messages.
 */
import { base64ToUint8Array, uint8ArrayToBase64 } from '../signal/signalUtils';

/**
 * Encrypt a file blob with a randomly generated AES-256-GCM key.
 * @param {Blob|File} fileBlob - The raw file to encrypt.
 * @returns {Promise<{ encryptedBlob: Blob, keyBase64: string, ivBase64: string }>}
 */
export async function encryptAttachment(fileBlob) {
    // Generate a random 256-bit AES key
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable — we need to export and send it via Signal
        ['encrypt', 'decrypt']
    );

    // Generate a random 12-byte IV (standard for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Read the file into an ArrayBuffer
    const plainBuffer = await fileBlob.arrayBuffer();

    // Encrypt
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plainBuffer
    );

    // Export the key as raw bytes so we can send it via Signal
    const rawKey = await crypto.subtle.exportKey('raw', key);

    // Convert key and IV to base64 for JSON serialization
    const keyBase64 = uint8ArrayToBase64(new Uint8Array(rawKey));
    const ivBase64 = uint8ArrayToBase64(iv);

    // Create an encrypted Blob to upload to S3
    const encryptedBlob = new Blob([cipherBuffer], { type: 'application/octet-stream' });

    return { encryptedBlob, keyBase64, ivBase64 };
}

/**
 * Decrypt an encrypted attachment using the AES key and IV.
 * @param {ArrayBuffer} encryptedBuffer - The encrypted data fetched from S3.
 * @param {string} keyBase64 - The base64-encoded AES key.
 * @param {string} ivBase64 - The base64-encoded IV.
 * @returns {Promise<ArrayBuffer>} The decrypted file bytes.
 */
export async function decryptAttachment(encryptedBuffer, keyBase64, ivBase64) {
    // Decode key and IV from base64
    const rawKey = base64ToUint8Array(keyBase64);
    const iv = base64ToUint8Array(ivBase64);

    // Import the raw key back into a CryptoKey
    const key = await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable — we only need to decrypt
        ['decrypt']
    );

    // Decrypt
    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
    );

    return plainBuffer;
}
