export function base64ToUint8Array(base64Str) {
    if (!base64Str) return null;
    const binaryStr = window.atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

export function uint8ArrayToBase64(bytes) {
    if (!bytes) return null;
    let binaryStr = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binaryStr += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binaryStr);
}

/**
 * Transforms a pre-key bundle received from the backend (Base64)
 * into the format expected by `establishSession` (Uint8Array with mapped fields).
 *
 * @param {Object} serverBundle - The user's pre-key bundle from the server
 * @param {number} deviceId - The device ID assigned to the user
 * @returns {Object} Bundle formatted for `establishSession`
 */
export function decodeServerBundle(serverBundle, deviceId = 1) {
    return {
        registrationId: serverBundle.registrationId,
        deviceId,
        identityKey: base64ToUint8Array(serverBundle.identityKey),
        
        // Signed Pre-Key mapping
        signedPreKeyId: serverBundle.signedPreKey.keyId,
        signedPreKeyPublicKey: base64ToUint8Array(serverBundle.signedPreKey.publicKey),
        signedPreKeySignature: base64ToUint8Array(serverBundle.signedPreKey.signature),

        // Kyber Pre-Key mapping
        kyberPreKeyId: serverBundle.kyberPreKey.keyId,
        kyberPreKeyPublicKey: base64ToUint8Array(serverBundle.kyberPreKey.publicKey),
        kyberPreKeySignature: base64ToUint8Array(serverBundle.kyberPreKey.signature),

        // Optional One-Time Pre-Key mapping
        preKeyId: serverBundle.oneTimePreKey ? serverBundle.oneTimePreKey.keyId : null,
        preKeyPublicKey: serverBundle.oneTimePreKey ? base64ToUint8Array(serverBundle.oneTimePreKey.publicKey) : null,
    };
}
