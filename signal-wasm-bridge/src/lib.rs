use wasm_bindgen::prelude::*;
use libsignal_protocol::{
    ProtocolAddress,
    CiphertextMessage,
    IdentityKeyPair,
    session_cipher,
    session,
    IdentityKeyStore, SessionStore, PreKeyStore, SignedPreKeyStore, KyberPreKeyStore,
};
use libsignal_protocol::storage::inmem::InMemSignalProtocolStore;
use rand::{rngs::OsRng, Rng};
use std::time::{SystemTime, UNIX_EPOCH};

#[wasm_bindgen]
pub fn start() {
    console_error_panic_hook::set_once();
}

fn current_timestamp() -> SystemTime {
    let now_ms: f64 = js_sys::Date::now();
    UNIX_EPOCH + std::time::Duration::from_millis(now_ms as u64)
} 