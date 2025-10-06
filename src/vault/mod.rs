//! HashiCorp Vault signer integration

use crate::{error::SignerError, traits::SolanaSigner};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use solana_sdk::{pubkey::Pubkey, signature::Signature, transaction::Transaction};
use std::sync::Arc;
use vaultrs::{
    client::{VaultClient, VaultClientSettingsBuilder},
    transit,
};

/// Vault-based signer using HashiCorp Vault transit engine
#[derive(Clone)]
pub struct VaultSigner {
    client: Arc<VaultClient>,
    key_name: String,
    pubkey: Pubkey,
}

impl std::fmt::Debug for VaultSigner {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("VaultSigner")
            .field("key_name", &self.key_name)
            .field("pubkey", &self.pubkey)
            .finish()
    }
}

impl VaultSigner {
    /// Creates a new Vault signer
    ///
    /// # Arguments
    ///
    /// * `vault_addr` - Vault server address (e.g., "https://vault.example.com")
    /// * `token` - Vault authentication token
    /// * `key_name` - Vault key name in transit engine
    /// * `pubkey` - Base58-encoded public key
    pub fn new(
        vault_addr: String,
        token: String,
        key_name: String,
        pubkey: String,
    ) -> Result<Self, SignerError> {
        let client = VaultClient::new(
            VaultClientSettingsBuilder::default()
                .address(vault_addr)
                .token(token)
                .build()
                .map_err(|e| {
                    SignerError::ConfigError(format!("Failed to build Vault client settings: {e}"))
                })?,
        );

        let pubkey = Pubkey::try_from(
            bs58::decode(pubkey)
                .into_vec()
                .map_err(|e| {
                    SignerError::InvalidPublicKey(format!(
                        "Failed to decode base58 public key: {e}"
                    ))
                })?
                .as_slice(),
        )
        .map_err(|e| SignerError::InvalidPublicKey(format!("Invalid public key bytes: {e}")))?;

        Ok(Self {
            client: Arc::new(client.map_err(|e| {
                SignerError::RemoteApiError(format!("Failed to create Vault client: {e}"))
            })?),
            key_name,
            pubkey,
        })
    }

    pub async fn sign(&self, serialized: &[u8]) -> Result<Signature, SignerError> {
        let signature = transit::data::sign(
            self.client.as_ref(),
            "transit",
            &self.key_name,
            &STANDARD.encode(serialized),
            None,
        )
        .await
        .map_err(|e| SignerError::RemoteApiError(format!("Failed to sign with Vault: {e}")))?;

        let sig_bytes = STANDARD.decode(signature.signature).map_err(|e| {
            SignerError::SerializationError(format!("Failed to decode signature: {e}"))
        })?;

        Signature::try_from(sig_bytes.as_slice())
            .map_err(|e| SignerError::SigningFailed(format!("Invalid signature format: {e}")))
    }
}

#[async_trait::async_trait]
impl SolanaSigner for VaultSigner {
    fn pubkey(&self) -> Pubkey {
        self.pubkey
    }

    async fn sign_transaction(&self, tx: &mut Transaction) -> Result<Signature, SignerError> {
        let serialized = bincode::serialize(tx).map_err(|e| {
            SignerError::SerializationError(format!("Failed to serialize transaction: {e}"))
        })?;
        self.sign(&serialized).await
    }

    async fn sign_message(&self, message: &[u8]) -> Result<Signature, SignerError> {
        self.sign(message).await
    }

    async fn is_available(&self) -> bool {
        // Check if we can read the key metadata as a health check
        // This verifies both Vault availability and key accessibility
        transit::key::read(self.client.as_ref(), "transit", &self.key_name)
            .await
            .is_ok()
    }
}
