use async_trait::async_trait;
use libsignal_protocol::{
    IdentityKey, IdentityKeyPair, IdentityKeyStore,
    KyberPreKeyId, KyberPreKeyRecord,
    KyberPreKeyStore, PreKeyId, PreKeyRecord, PreKeyStore, ProtocolAddress, ProtocolStore,
    SenderKeyRecord, SenderKeyStore, SessionRecord, SessionStore, SignalProtocolError,
    SignedPreKeyId, SignedPreKeyRecord, SignedPreKeyStore,
    GenericSignedPreKey,
    storage::{Direction, IdentityChange},
};
use uuid::Uuid;
use wasm_bindgen::prelude::*;

type Result<T> = std::result::Result<T, SignalProtocolError>;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = loadSession)]
    async fn load_session_js(address: String) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = storeSession)]
    async fn store_session_js(address: String, record: Vec<u8>) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = getIdentityKeyPair)]
    pub async fn get_identity_key_pair_js() -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = getLocalRegistrationId)]
    pub async fn get_local_registration_id_js() -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = saveIdentity)]
    async fn save_identity_js(address: String, identity: Vec<u8>) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = isTrustedIdentity)]
    async fn is_trusted_identity_js(address: String, identity: Vec<u8>, direction: u8) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = getIdentity)]
    async fn get_identity_js(address: String) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = getPreKey)]
    async fn get_pre_key_js(id: u32) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = savePreKey)]
    async fn save_pre_key_js(id: u32, record: Vec<u8>) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = removePreKey)]
    async fn remove_pre_key_js(id: u32) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = getSignedPreKey)]
    async fn get_signed_pre_key_js(id: u32) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = saveSignedPreKey)]
    async fn save_signed_pre_key_js(id: u32, record: Vec<u8>) -> JsValue;
    
    // Kyber keys (Post-Quantum)
    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = getKyberPreKey)]
    async fn get_kyber_pre_key_js(id: u32) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = saveKyberPreKey)]
    async fn save_kyber_pre_key_js(id: u32, record: Vec<u8>) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = markKyberPreKeyUsed)]
    async fn mark_kyber_pre_key_used_js(id: u32, ec_id: u32, base_key: Vec<u8>) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = initIdentity)]
    pub async fn init_identity_js(identity_key_pair: Vec<u8>, registration_id: u32) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = storeSenderKey)]
    async fn store_sender_key_js(key: String, record: Vec<u8>) -> JsValue;

    #[wasm_bindgen(js_namespace = ["window", "signalStorage"], js_name = loadSenderKey)]
    async fn load_sender_key_js(key: String) -> JsValue;
}

#[derive(Clone)]
pub struct BridgeStore;

// Helper to convert ProtocolAddress to String key
fn addr_to_string(address: &ProtocolAddress) -> String {
    format!("{}.{}", address.name(), address.device_id())
}

#[async_trait(?Send)]
impl SessionStore for BridgeStore {
    async fn load_session(&self, address: &ProtocolAddress) -> Result<Option<SessionRecord>> {
        let key = addr_to_string(address);
        let val = load_session_js(key).await;
        
        if val.is_null() || val.is_undefined() {
            return Ok(None);
        }
        
        let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
            .map_err(|_| SignalProtocolError::InvalidSessionStructure("JS bridge serialization error"))?;
            
        let record = SessionRecord::deserialize(&bytes)?;
        Ok(Some(record))
    }

    async fn store_session(&mut self, address: &ProtocolAddress, record: &SessionRecord) -> Result<()> {
        let key = addr_to_string(address);
        let bytes = record.serialize()?;
        store_session_js(key, bytes).await;
        Ok(())
    }
}

#[async_trait(?Send)]
impl IdentityKeyStore for BridgeStore {
    async fn get_identity_key_pair(&self) -> Result<IdentityKeyPair> {
        let val = get_identity_key_pair_js().await;
        let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
            .map_err(|_| SignalProtocolError::InvalidProtobufEncoding)?;
        IdentityKeyPair::try_from(&bytes[..])
            .map_err(|_| SignalProtocolError::InvalidProtobufEncoding)
    }

    async fn get_local_registration_id(&self) -> Result<u32> {
        let val = get_local_registration_id_js().await;
        serde_wasm_bindgen::from_value(val)
             .map_err(|_| SignalProtocolError::InvalidProtobufEncoding)
    }

    async fn save_identity(&mut self, address: &ProtocolAddress, identity: &IdentityKey) -> Result<IdentityChange> {
        let key = addr_to_string(address);
        let bytes = identity.serialize();
        let val = save_identity_js(key, bytes.into()).await;
        // JS saveIdentity returns true if the identity key existed and changed
        let changed = val.as_bool().unwrap_or(false);
        Ok(IdentityChange::from_changed(changed))
    }

    async fn is_trusted_identity(&self, address: &ProtocolAddress, identity: &IdentityKey, direction: Direction) -> Result<bool> {
        let key = addr_to_string(address);
        let bytes = identity.serialize();
        let dir_val = match direction {
            Direction::Sending => 0,
            Direction::Receiving => 1,
        };
        let val = is_trusted_identity_js(key, bytes.into(), dir_val).await;
        Ok(val.as_bool().unwrap_or(false)) 
    }

    async fn get_identity(&self, address: &ProtocolAddress) -> Result<Option<IdentityKey>> {
         let key = addr_to_string(address);
         let val = get_identity_js(key).await;
         if val.is_null() || val.is_undefined() {
             return Ok(None);
         }
         let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
             .map_err(|_| SignalProtocolError::InvalidProtobufEncoding)?;
         let key = IdentityKey::decode(&bytes)
             .map_err(|_| SignalProtocolError::InvalidProtobufEncoding)?;
         Ok(Some(key))
    }
}

#[async_trait(?Send)]
impl PreKeyStore for BridgeStore {
    async fn get_pre_key(&self, id: PreKeyId) -> Result<PreKeyRecord> {
        let val = get_pre_key_js(id.into()).await;
        if val.is_null() || val.is_undefined() {
             return Err(SignalProtocolError::InvalidPreKeyId);
        }
        let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
             .map_err(|_| SignalProtocolError::InvalidPreKeyId)?;
        PreKeyRecord::deserialize(&bytes)
            .map_err(|_| SignalProtocolError::InvalidPreKeyId)
    }

    async fn save_pre_key(&mut self, id: PreKeyId, record: &PreKeyRecord) -> Result<()> {
        let bytes = record.serialize()?;
        save_pre_key_js(id.into(), bytes).await;
        Ok(())
    }

    async fn remove_pre_key(&mut self, id: PreKeyId) -> Result<()> {
        remove_pre_key_js(id.into()).await;
        Ok(())
    }
}

#[async_trait(?Send)]
impl SignedPreKeyStore for BridgeStore {
    async fn get_signed_pre_key(&self, id: SignedPreKeyId) -> Result<SignedPreKeyRecord> {
        let val = get_signed_pre_key_js(id.into()).await;
        if val.is_null() || val.is_undefined() {
             return Err(SignalProtocolError::InvalidSignedPreKeyId);
        }
        let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
             .map_err(|_| SignalProtocolError::InvalidSignedPreKeyId)?;
        SignedPreKeyRecord::deserialize(&bytes)
            .map_err(|_| SignalProtocolError::InvalidSignedPreKeyId)
    }

    async fn save_signed_pre_key(&mut self, id: SignedPreKeyId, record: &SignedPreKeyRecord) -> Result<()> {
        let bytes = record.serialize()?;
        save_signed_pre_key_js(id.into(), bytes).await;
        Ok(())
    }
}

#[async_trait(?Send)]
impl KyberPreKeyStore for BridgeStore {
    async fn get_kyber_pre_key(&self, id: KyberPreKeyId) -> Result<KyberPreKeyRecord> {
         let val = get_kyber_pre_key_js(id.into()).await;
         if val.is_null() || val.is_undefined() {
              return Err(SignalProtocolError::InvalidKyberPreKeyId);
         }
         let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
              .map_err(|_| SignalProtocolError::InvalidKyberPreKeyId)?;
         KyberPreKeyRecord::deserialize(&bytes)
             .map_err(|_| SignalProtocolError::InvalidKyberPreKeyId)
    }

    async fn save_kyber_pre_key(&mut self, id: KyberPreKeyId, record: &KyberPreKeyRecord) -> Result<()> {
        let bytes = record.serialize()?;
        save_kyber_pre_key_js(id.into(), bytes).await;
        Ok(())
    }

    async fn mark_kyber_pre_key_used(&mut self, id: KyberPreKeyId, ec_id: SignedPreKeyId, base_key: &libsignal_protocol::PublicKey) -> Result<()> {
        let base_key_bytes = base_key.serialize().to_vec();
        let val = mark_kyber_pre_key_used_js(id.into(), ec_id.into(), base_key_bytes).await;
        // JS returns false when a duplicate (kyber_id, ec_id, base_key) combo is detected
        if val.as_bool() == Some(false) {
            return Err(SignalProtocolError::InvalidArgument(
                format!("replay detected: kyber pre-key {} already used with ec_id {} and this base_key", u32::from(id), u32::from(ec_id)),
            ));
        }
        Ok(())
    }
}

// SenderKeyStore — backed by JS IndexedDB for group messaging support
#[async_trait(?Send)]
impl SenderKeyStore for BridgeStore {
    async fn store_sender_key(&mut self, sender: &ProtocolAddress, distribution_id: Uuid, record: &SenderKeyRecord) -> Result<()> {
        let key = format!("{}.{}:{}", sender.name(), sender.device_id(), distribution_id);
        let bytes = record.serialize()?;
        store_sender_key_js(key, bytes).await;
        Ok(())
    }
    async fn load_sender_key(&mut self, sender: &ProtocolAddress, distribution_id: Uuid) -> Result<Option<SenderKeyRecord>> {
        let key = format!("{}.{}:{}", sender.name(), sender.device_id(), distribution_id);
        let val = load_sender_key_js(key).await;
        if val.is_null() || val.is_undefined() {
            return Ok(None);
        }
        let bytes: Vec<u8> = serde_wasm_bindgen::from_value(val)
            .map_err(|_| SignalProtocolError::InvalidProtobufEncoding)?;
        let record = SenderKeyRecord::deserialize(&bytes)?;
        Ok(Some(record))
    }
}

impl ProtocolStore for BridgeStore {}
