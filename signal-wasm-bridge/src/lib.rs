use wasm_bindgen::prelude::*;
use libsignal_protocol::{
    ProtocolAddress, CiphertextMessage, IdentityKeyPair, PreKeyBundle,
    IdentityKey, PublicKey, DeviceId, KeyPair,
    SignalMessage, PreKeySignalMessage, SenderKeyMessage,
    PreKeyRecord, PreKeyId, SignedPreKeyRecord, SignedPreKeyId,
    KyberPreKeyId, KyberPreKeyRecord,
    GenericSignedPreKey, Timestamp,
    session::process_prekey_bundle,
    session_cipher::{message_encrypt, message_decrypt},
    SignalProtocolError,
    kem,
    SenderKeyDistributionMessage,
    create_sender_key_distribution_message, process_sender_key_distribution_message,
    group_encrypt, group_decrypt,
};
use uuid::Uuid;
use rand::rngs::OsRng;
use rand::{CryptoRng, Rng, RngCore, TryRngCore as _};
use std::convert::TryFrom;
use std::time::{SystemTime, UNIX_EPOCH};

mod store;
use store::BridgeStore;

// Enable hook for better error messages
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Returns the current wall-clock time as a SystemTime, safe for WASM
/// where `SystemTime::now()` would panic.
fn current_timestamp() -> SystemTime {
    let now_ms = js_sys::Date::now();
    UNIX_EPOCH + std::time::Duration::from_millis(now_ms as u64)
}

/// Returns a cryptographically-secure RNG suitable for WASM.
fn get_rng() -> impl CryptoRng + RngCore {
    OsRng.unwrap_err()
}

#[wasm_bindgen]
pub struct SignalProtocolAddress {
    inner: ProtocolAddress,
}

#[wasm_bindgen]
impl SignalProtocolAddress {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String, device_id: u32) -> Result<SignalProtocolAddress, JsValue> {
        Ok(Self {
            inner: ProtocolAddress::new(name, DeviceId::try_from(device_id).map_err(|_| JsValue::from_str("Invalid DeviceId"))?),
        })
    }
    
    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{}.{}", self.inner.name(), self.inner.device_id())
    }
}

#[wasm_bindgen]
pub struct SessionBuilder {
    store: BridgeStore,
}

#[wasm_bindgen]
impl SessionBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { store: BridgeStore }
    }

    /// Processes a remote user's pre-key bundle (with Kyber/post-quantum support)
    /// to establish a new Signal session.
    #[wasm_bindgen(js_name = processPreKeyBundleWithKyber)]
    pub async fn process_pre_key_bundle_with_kyber(
        &mut self,
        remote_address: &SignalProtocolAddress,
        registration_id: u32,
        device_id: u32,
        pre_key_id: Option<u32>,
        pre_key_public_key: Option<Vec<u8>>,
        signed_pre_key_id: u32,
        signed_pre_key_public_key: Vec<u8>,
        signed_pre_key_signature: Vec<u8>,
        identity_key: Vec<u8>,
        kyber_pre_key_id: u32,
        kyber_pre_key_public_key: Vec<u8>,
        kyber_pre_key_signature: Vec<u8>
    ) -> Result<(), JsValue> {
         let identity_key_obj = IdentityKey::decode(&identity_key)
            .map_err(|e| JsValue::from_str(&format!("Invalid identity key: {}", e)))?;
            
        let signed_pre_key_ec = PublicKey::deserialize(&signed_pre_key_public_key)
             .map_err(|e| JsValue::from_str(&format!("Invalid signed pre key: {}", e)))?;
             
        let pre_key_ec = match pre_key_public_key {
            Some(bytes) => Some(PublicKey::deserialize(&bytes)
                 .map_err(|e| JsValue::from_str(&format!("Invalid pre key: {}", e)))?),
            None => None,
        };
        
        let kyber_public_key = kem::PublicKey::deserialize(&kyber_pre_key_public_key)
             .map_err(|e| JsValue::from_str(&format!("Invalid kyber key: {}", e)))?;

        let pre_key_tuple = match (pre_key_id, pre_key_ec) {
            (Some(id), Some(ec)) => Some((PreKeyId::from(id), ec)),
            _ => None,
        };

        let bundle = PreKeyBundle::new(
            registration_id,
            DeviceId::try_from(device_id).map_err(|_| JsValue::from_str("Invalid DeviceId"))?,
            pre_key_tuple,
            signed_pre_key_id.into(),
            signed_pre_key_ec,
            signed_pre_key_signature,
            kyber_pre_key_id.into(),
            kyber_public_key,
            kyber_pre_key_signature,
            identity_key_obj,
        ).map_err(|e| JsValue::from_str(&format!("Invalid bundle: {}", e)))?;
        
        let mut rng = get_rng();
        let now = current_timestamp();
        
        let mut session_store = self.store.clone();
        let mut identity_store = self.store.clone();
        
        process_prekey_bundle(
            &remote_address.inner,
            &mut session_store,
            &mut identity_store,
            &bundle,
            now,
            &mut rng
        ).await.map_err(|e| JsValue::from_str(&format!("Process bundle failed: {}", e)))?;
        
        Ok(())
    }
}

#[wasm_bindgen]
pub struct SessionCipher {
    store: BridgeStore,
    remote_address: ProtocolAddress,
}

#[wasm_bindgen]
impl SessionCipher {
    #[wasm_bindgen(constructor)]
    pub fn new(address: &SignalProtocolAddress) -> Self {
        Self {
            store: BridgeStore,
            remote_address: address.inner.clone(),
        }
    }

    /// Encrypts a plaintext message.
    /// Returns a JS object: `{ type: number, body: Uint8Array }`
    /// where `type` is the CiphertextMessageType (2=Whisper, 3=PreKey).
    pub async fn encrypt(&mut self, message: &[u8]) -> Result<JsValue, JsValue> {
        let mut rng = get_rng();
        let now = current_timestamp();
        
        let mut session_store = self.store.clone();
        let mut identity_store = self.store.clone();
        
        let ciphertext = message_encrypt(
            message,
            &self.remote_address,
            &mut session_store,
            &mut identity_store,
            now,
            &mut rng
        ).await.map_err(|e| signal_error_to_js("encrypt", &e))?;
        
        let result = js_sys::Object::new();
        js_sys::Reflect::set(&result, &"type".into(), &JsValue::from(ciphertext.message_type() as u8))?;
        let body = js_sys::Uint8Array::from(ciphertext.serialize());
        js_sys::Reflect::set(&result, &"body".into(), &body)?;
        Ok(result.into())
    }

    /// Decrypts a ciphertext message.
    /// `msg_type` is the CiphertextMessageType value (2=Whisper/SignalMessage, 3=PreKey).
    /// `ciphertext` is the raw message bytes (the `body` from `encrypt`).
    pub async fn decrypt(&mut self, msg_type: u8, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        let mut rng = get_rng();
        
        let message_obj = deserialize_ciphertext_typed(msg_type, ciphertext)
             .map_err(|e| signal_error_to_js("decrypt", &e))?;

        let mut session_store = self.store.clone();
        let mut identity_store = self.store.clone();
        let mut pre_key_store = self.store.clone();
        let signed_pre_key_store = self.store.clone();
        let mut kyber_pre_key_store = self.store.clone();
        
        let plaintext = message_decrypt(
            &message_obj,
            &self.remote_address,
            &mut session_store,
            &mut identity_store,
            &mut pre_key_store,
            &signed_pre_key_store,
            &mut kyber_pre_key_store,
            &mut rng
        ).await.map_err(|e| signal_error_to_js("decrypt", &e))?;
        
        Ok(plaintext)
    }
}

// ─── Group Chat Initialization ───────────────────────────────────────

#[wasm_bindgen]
pub struct GroupSessionBuilder {
    store: BridgeStore,
}

#[wasm_bindgen]
impl GroupSessionBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { store: BridgeStore }
    }

    /// Creates a SenderKeyDistributionMessage to be distributed to group members
    #[wasm_bindgen(js_name = createSenderKeyDistributionMessage)]
    pub async fn create_sender_key_distribution_message(
        &mut self,
        sender_address: &SignalProtocolAddress,
        distribution_id: &str,
    ) -> Result<JsValue, JsValue> {
        let mut rng = get_rng();
        let mut store = self.store.clone();
        
        let did = Uuid::parse_str(distribution_id)
            .map_err(|e| JsValue::from_str(&format!("Invalid UUID formats for distributionId: {}", e)))?;

        let skdm = create_sender_key_distribution_message(
            &sender_address.inner,
            did,
            &mut store,
            &mut rng
        ).await.map_err(|e: SignalProtocolError| signal_error_to_js("create_sender_key_distribution_message", &e))?;
        
        let bytes = skdm.serialized();
        
        let array = js_sys::Uint8Array::from(bytes);
        Ok(array.into())
    }

    /// Processes a received SenderKeyDistributionMessage from someone else
    #[wasm_bindgen(js_name = processSenderKeyDistributionMessage)]
    pub async fn process_sender_key_distribution_message(
        &mut self,
        sender_address: &SignalProtocolAddress,
        message_bytes: &[u8],
    ) -> Result<(), JsValue> {
        let skdm = SenderKeyDistributionMessage::try_from(message_bytes)
            .map_err(|e| signal_error_to_js("deserialize_skdm", &e))?;

        let mut store = self.store.clone();

        process_sender_key_distribution_message(
            &sender_address.inner,
            &skdm,
            &mut store
        ).await.map_err(|e: SignalProtocolError| signal_error_to_js("process_sender_key_distribution_message", &e))?;

        Ok(())
    }
}

#[wasm_bindgen]
pub struct GroupCipher {
    store: BridgeStore,
    sender_address: ProtocolAddress,
}

#[wasm_bindgen]
impl GroupCipher {
    #[wasm_bindgen(constructor)]
    pub fn new(address: &SignalProtocolAddress) -> Self {
        Self {
            store: BridgeStore,
            sender_address: address.inner.clone(),
        }
    }

    /// Encrypts a message for the group
    pub async fn encrypt(&mut self, distribution_id: &str, message: &[u8]) -> Result<JsValue, JsValue> {
        let mut rng = get_rng();
        let mut store = self.store.clone();
        
        let did = Uuid::parse_str(distribution_id)
            .map_err(|e| JsValue::from_str(&format!("Invalid UUID: {}", e)))?;

        let skm = group_encrypt(
            &mut store,
            &self.sender_address,
            did,
            message,
            &mut rng
        ).await.map_err(|e: SignalProtocolError| signal_error_to_js("group_encrypt", &e))?;

        let bytes = skm.serialized();
        
        let result = js_sys::Object::new();
        // 7 corresponds to SenderKeyMessage in deserialize_ciphertext_typed
        let array = js_sys::Uint8Array::from(bytes);
        js_sys::Reflect::set(&result, &"type".into(), &JsValue::from(7u8))?;
        js_sys::Reflect::set(&result, &"body".into(), &array.into())?;
        Ok(result.into())
    }

    /// Decrypts a message from the group
    pub async fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        let mut store = self.store.clone();

        let plaintext = group_decrypt(
            ciphertext,
            &mut store,
            &self.sender_address
        ).await.map_err(|e: SignalProtocolError| signal_error_to_js("group_decrypt", &e))?;

        Ok(plaintext)
    }
}

// ─── Identity Initialization ─────────────────────────────────────────

/// Ensures the local identity is initialized (idempotent).
/// If identity keys already exist in storage, returns them.
/// Otherwise generates a new IdentityKeyPair + registrationId, stores them,
/// and returns a JS object: `{ identityKeyPair: Uint8Array, registrationId: number }`.
#[wasm_bindgen(js_name = initIdentity)]
pub async fn init_identity() -> Result<JsValue, JsValue> {
    use store::{get_identity_key_pair_js, get_local_registration_id_js, init_identity_js};

    // Check if already initialized
    let existing = get_identity_key_pair_js().await;
    if !existing.is_null() && !existing.is_undefined() {
        let reg_id_val = get_local_registration_id_js().await;
        let result = js_sys::Object::new();
        js_sys::Reflect::set(&result, &"identityKeyPair".into(), &existing)?;
        js_sys::Reflect::set(&result, &"registrationId".into(), &reg_id_val)?;
        return Ok(result.into());
    }

    // Generate new identity
    let mut rng = get_rng();
    let key_pair = IdentityKeyPair::generate(&mut rng);
    let pair_bytes = key_pair.serialize();
    let reg_id: u32 = rng.random::<u32>() & 0x3FFF;

    // Store via JS bridge
    init_identity_js(pair_bytes.to_vec(), reg_id).await;

    // Return the generated values
    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"identityKeyPair".into(), &js_sys::Uint8Array::from(&pair_bytes[..]))?;
    js_sys::Reflect::set(&result, &"registrationId".into(), &JsValue::from(reg_id))?;
    Ok(result.into())
}

// ─── Key Generation Helpers ──────────────────────────────────────────

/// Generates a new identity key pair.
/// Returns serialized bytes as a Uint8Array.
#[wasm_bindgen(js_name = generateIdentityKeyPair)]
pub fn generate_identity_key_pair() -> Result<JsValue, JsValue> {
    let mut rng = get_rng();
    let key_pair = IdentityKeyPair::generate(&mut rng);
    let bytes = key_pair.serialize();
    Ok(js_sys::Uint8Array::from(&bytes[..]).into())
}

/// Extracts only the public identity key from a serialized IdentityKeyPair.
/// Use this before uploading to the server — NEVER send the full pair.
#[wasm_bindgen(js_name = extractIdentityPublicKey)]
pub fn extract_identity_public_key(identity_key_pair_bytes: &[u8]) -> Result<JsValue, JsValue> {
    let key_pair = IdentityKeyPair::try_from(identity_key_pair_bytes)
        .map_err(|e| JsValue::from_str(&format!("Invalid identity key pair: {}", e)))?;
    let public_bytes = key_pair.public_key().serialize();
    Ok(js_sys::Uint8Array::from(public_bytes.as_ref()).into())
}

/// Generates a registration ID (14-bit, per Signal spec).
#[wasm_bindgen(js_name = generateRegistrationId)]
pub fn generate_registration_id() -> Result<u32, JsValue> {
    let mut rng = get_rng();
    Ok(rng.random::<u32>() & 0x3FFF)
}

/// Generates a batch of unsigned pre-keys.
/// Returns a JS array of objects: `[{ id: number, record: Uint8Array, publicKey: Uint8Array }, ...]`
#[wasm_bindgen(js_name = generatePreKeys)]
pub fn generate_pre_keys(start_id: u32, count: u32) -> Result<JsValue, JsValue> {
    let mut rng = get_rng();
    let result = js_sys::Array::new();

    for i in 0..count {
        let id = PreKeyId::from(start_id + i);
        let key_pair = KeyPair::generate(&mut rng);
        let record = PreKeyRecord::new(id, &key_pair);
        let serialized = record.serialize()
            .map_err(|e| JsValue::from_str(&format!("PreKey serialize failed: {}", e)))?;

        let entry = js_sys::Object::new();
        js_sys::Reflect::set(&entry, &"id".into(), &JsValue::from(start_id + i))?;
        js_sys::Reflect::set(&entry, &"record".into(), &js_sys::Uint8Array::from(&serialized[..]))?;
        js_sys::Reflect::set(&entry, &"publicKey".into(), &js_sys::Uint8Array::from(key_pair.public_key.serialize().as_ref()))?;
        result.push(&entry);
    }

    Ok(result.into())
}

/// Generates a signed pre-key.
/// Takes the serialized identity key pair bytes and a signed pre-key ID.
/// Returns a JS object: `{ id: number, record: Uint8Array, publicKey: Uint8Array, signature: Uint8Array }`
#[wasm_bindgen(js_name = generateSignedPreKey)]
pub fn generate_signed_pre_key(identity_key_pair_bytes: &[u8], signed_pre_key_id: u32) -> Result<JsValue, JsValue> {
    let mut rng = get_rng();

    let identity_key_pair = IdentityKeyPair::try_from(identity_key_pair_bytes)
        .map_err(|e| JsValue::from_str(&format!("Invalid identity key pair: {}", e)))?;

    let spk_id = SignedPreKeyId::from(signed_pre_key_id);
    let key_pair = KeyPair::generate(&mut rng);
    let timestamp = Timestamp::from_epoch_millis(js_sys::Date::now() as u64);

    let signature = identity_key_pair.private_key()
        .calculate_signature(&key_pair.public_key.serialize(), &mut rng)
        .map_err(|e| JsValue::from_str(&format!("Signing failed: {}", e)))?;

    let record = SignedPreKeyRecord::new(spk_id, timestamp, &key_pair, &signature);
    let serialized = record.serialize()
        .map_err(|e| JsValue::from_str(&format!("SignedPreKey serialize failed: {}", e)))?;

    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"id".into(), &JsValue::from(signed_pre_key_id))?;
    js_sys::Reflect::set(&result, &"record".into(), &js_sys::Uint8Array::from(&serialized[..]))?;
    js_sys::Reflect::set(&result, &"publicKey".into(), &js_sys::Uint8Array::from(key_pair.public_key.serialize().as_ref()))?;
    js_sys::Reflect::set(&result, &"signature".into(), &js_sys::Uint8Array::from(&signature[..]))?;
    Ok(result.into())
}

/// Generates a Kyber (post-quantum) pre-key.
/// Takes the serialized identity key pair bytes and a kyber pre-key ID.
/// Returns a JS object: `{ id: number, record: Uint8Array, publicKey: Uint8Array, signature: Uint8Array }`
#[wasm_bindgen(js_name = generateKyberPreKey)]
pub fn generate_kyber_pre_key(identity_key_pair_bytes: &[u8], kyber_pre_key_id: u32) -> Result<JsValue, JsValue> {
    let mut rng = get_rng();

    let identity_key_pair = IdentityKeyPair::try_from(identity_key_pair_bytes)
        .map_err(|e| JsValue::from_str(&format!("Invalid identity key pair: {}", e)))?;

    let kyber_id = KyberPreKeyId::from(kyber_pre_key_id);
    let kyber_key_pair = kem::KeyPair::generate(kem::KeyType::Kyber1024, &mut rng);
    let timestamp = Timestamp::from_epoch_millis(js_sys::Date::now() as u64);

    let signature = identity_key_pair.private_key()
        .calculate_signature(&kyber_key_pair.public_key.serialize(), &mut rng)
        .map_err(|e| JsValue::from_str(&format!("Kyber signing failed: {}", e)))?;

    let record = KyberPreKeyRecord::new(kyber_id, timestamp, &kyber_key_pair, &signature);
    let serialized = record.serialize()
        .map_err(|e| JsValue::from_str(&format!("KyberPreKey serialize failed: {}", e)))?;

    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"id".into(), &JsValue::from(kyber_pre_key_id))?;
    js_sys::Reflect::set(&result, &"record".into(), &js_sys::Uint8Array::from(&serialized[..]))?;
    js_sys::Reflect::set(&result, &"publicKey".into(), &js_sys::Uint8Array::from(kyber_key_pair.public_key.serialize().as_ref()))?;
    js_sys::Reflect::set(&result, &"signature".into(), &js_sys::Uint8Array::from(&signature[..]))?;
    Ok(result.into())
}

// ─── Internal Helpers ────────────────────────────────────────────────

/// Deserializes ciphertext bytes into a CiphertextMessage using the explicit type tag.
fn deserialize_ciphertext_typed(msg_type: u8, data: &[u8]) -> Result<CiphertextMessage, SignalProtocolError> {
    match msg_type {
        3 => {
            let m = PreKeySignalMessage::try_from(data)?;
            Ok(CiphertextMessage::PreKeySignalMessage(m))
        }
        2 => {
            let m = SignalMessage::try_from(data)?;
            Ok(CiphertextMessage::SignalMessage(m))
        }
        7 => {
            let m = SenderKeyMessage::try_from(data)?;
            Ok(CiphertextMessage::SenderKeyMessage(m))
        }
        _ => Err(SignalProtocolError::InvalidProtobufEncoding),
    }
}

/// Converts a SignalProtocolError into a structured JS error object.
/// Returns `{ type: string, message: string, address?: string }`
/// so the frontend can programmatically distinguish error types.
fn signal_error_to_js(operation: &str, err: &SignalProtocolError) -> JsValue {
    let result = js_sys::Object::new();

    let (error_type, message, address) = match err {
        SignalProtocolError::UntrustedIdentity(addr) => (
            "UntrustedIdentity",
            format!("{} failed: untrusted identity for {}", operation, addr),
            Some(addr.to_string()),
        ),
        SignalProtocolError::InvalidPreKeyId => (
            "InvalidPreKeyId",
            format!("{} failed: invalid or missing pre-key", operation),
            None,
        ),
        SignalProtocolError::InvalidSignedPreKeyId => (
            "InvalidSignedPreKeyId",
            format!("{} failed: invalid or missing signed pre-key", operation),
            None,
        ),
        SignalProtocolError::InvalidKyberPreKeyId => (
            "InvalidKyberPreKeyId",
            format!("{} failed: invalid or missing Kyber pre-key", operation),
            None,
        ),
        SignalProtocolError::SessionNotFound(addr) => (
            "SessionNotFound",
            format!("{} failed: no session found for {}", operation, addr),
            Some(addr.to_string()),
        ),
        other => (
            "SignalProtocolError",
            format!("{} failed: {}", operation, other),
            None,
        ),
    };

    let _ = js_sys::Reflect::set(&result, &"type".into(), &JsValue::from_str(error_type));
    let _ = js_sys::Reflect::set(&result, &"message".into(), &JsValue::from_str(&message));
    if let Some(addr_str) = address {
        let _ = js_sys::Reflect::set(&result, &"address".into(), &JsValue::from_str(&addr_str));
    }

    result.into()
}

// ─── Native Unit Tests ──────────────────────────────────────────────
// These tests run with `cargo test` on the native target (no WASM needed).
// They test the pure Rust cryptographic logic that underpins the WASM exports.

#[cfg(test)]
mod tests {
    use super::*;
    use libsignal_protocol::{
        IdentityKeyPair, KeyPair, PreKeyId, PreKeyRecord,
        SignedPreKeyId, SignedPreKeyRecord,
        GenericSignedPreKey, Timestamp,
    };


    // ─── deserialize_ciphertext_typed ─────────────────────────────────

    #[test]
    fn unknown_msg_type_returns_error() {
        let data = &[0u8; 10];
        let result = deserialize_ciphertext_typed(99, data);
        assert!(result.is_err(), "Unknown message type should return error");
    }

    #[test]
    fn type_2_requires_valid_signal_message() {
        let garbage = &[0u8; 10];
        let result = deserialize_ciphertext_typed(2, garbage);
        assert!(result.is_err(), "Garbage bytes should not parse as SignalMessage");
    }

    #[test]
    fn type_3_requires_valid_prekey_signal_message() {
        let garbage = &[0u8; 10];
        let result = deserialize_ciphertext_typed(3, garbage);
        assert!(result.is_err(), "Garbage bytes should not parse as PreKeySignalMessage");
    }

    #[test]
    fn type_7_requires_valid_sender_key_message() {
        let garbage = &[0u8; 10];
        let result = deserialize_ciphertext_typed(7, garbage);
        assert!(result.is_err(), "Garbage bytes should not parse as SenderKeyMessage");
    }

    // ─── Identity Key Pair Generation ─────────────────────────────────

    #[test]
    fn identity_key_pair_generates_valid_keys() {
        let mut rng = rand::rng();
        let kp = IdentityKeyPair::generate(&mut rng);

        // Deserialize and verify both keys exist with correct sizes
        let restored = IdentityKeyPair::try_from(&kp.serialize()[..])
            .expect("Generated key pair should deserialize successfully");

        let pub_bytes = restored.public_key().serialize();
        assert_eq!(pub_bytes.len(), 33, "Public key should be 33 bytes (compressed Curve25519)");

        let priv_bytes = restored.private_key().serialize();
        assert_eq!(priv_bytes.len(), 32, "Private key should be 32 bytes (Curve25519 scalar)");

        assert_eq!(
            kp.public_key().serialize(),
            restored.public_key().serialize(),
            "Public key must match after deserialization"
        );
    }

    #[test]
    fn identity_key_pairs_are_unique() {
        let mut rng = rand::rng();
        let a = IdentityKeyPair::generate(&mut rng).serialize();
        let b = IdentityKeyPair::generate(&mut rng).serialize();
        assert_ne!(a, b, "Two generated key pairs must differ");
    }


    // ─── PreKey Generation ────────────────────────────────────────────

    #[test]
    fn pre_key_record_serialization() {
        let mut rng = rand::rng();
        let kp = KeyPair::generate(&mut rng);
        let id = PreKeyId::from(42u32);
        let record = PreKeyRecord::new(id, &kp);
        let bytes = record.serialize().unwrap();
        assert!(!bytes.is_empty());

        let restored = PreKeyRecord::deserialize(&bytes).unwrap();
        assert_eq!(restored.public_key().unwrap().serialize(), kp.public_key.serialize());
    }

    // ─── Signed PreKey ────────────────────────────────────────────────

    #[test]
    fn signed_pre_key_signature_is_valid() {
        let mut rng = rand::rng();
        let identity = IdentityKeyPair::generate(&mut rng);
        let spk_pair = KeyPair::generate(&mut rng);
        let timestamp = Timestamp::from_epoch_millis(1000);

        let signature = identity.private_key()
            .calculate_signature(&spk_pair.public_key.serialize(), &mut rng)
            .unwrap();
        assert_eq!(signature.len(), 64, "Ed25519 signature must be 64 bytes");

        let record = SignedPreKeyRecord::new(SignedPreKeyId::from(1u32), timestamp, &spk_pair, &signature);
        let bytes = record.serialize().unwrap();
        let restored = SignedPreKeyRecord::deserialize(&bytes).unwrap();
        assert_eq!(restored.signature().unwrap().as_ref() as &[u8], &signature[..]);
    }

    // ─── Kyber PreKey ─────────────────────────────────────────────────

    #[test]
    fn kyber_key_pair_generates_correctly() {
        let mut rng = rand::rng();
        let identity = IdentityKeyPair::generate(&mut rng);

        let kyber_kp = kem::KeyPair::generate(kem::KeyType::Kyber1024, &mut rng);

        let pk_bytes = kyber_kp.public_key.serialize();
        assert_eq!(pk_bytes.len(), 1569, "Kyber1024 public key must be exactly 1569 bytes (1568 + 1 byte type prefix)");

        let signature = identity.private_key()
            .calculate_signature(&pk_bytes, &mut rng)
            .unwrap();
        assert_eq!(signature.len(), 64, "Ed25519 signature must be 64 bytes");

        let timestamp = Timestamp::from_epoch_millis(1000);
        let record = KyberPreKeyRecord::new(KyberPreKeyId::from(1u32), timestamp, &kyber_kp, &signature);
        let bytes = record.serialize().unwrap();
        let restored = KyberPreKeyRecord::deserialize(&bytes).unwrap();
        assert_eq!(
            restored.public_key().unwrap().serialize(),
            pk_bytes,
            "Public key must survive serialization roundtrip"
        );

        let kyber_kp2 = kem::KeyPair::generate(kem::KeyType::Kyber1024, &mut rng);
        assert_ne!(
            kyber_kp.public_key.serialize(),
            kyber_kp2.public_key.serialize(),
            "Two Kyber key pairs must differ"
        );
    }
}