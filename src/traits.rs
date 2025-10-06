//! Core trait definitions for Solana signers

use async_trait::async_trait;
use solana_sdk::{pubkey::Pubkey, signature::Signature, transaction::Transaction};

use crate::error::SignerError;

/// Trait for signing Solana transactions
///
/// All signer implementations must implement this trait to provide
/// a unified interface for transaction signing.
#[async_trait]
pub trait SolanaSigner: Send + Sync {
    /// Get the public key of this signer
    fn pubkey(&self) -> Pubkey;

    /// Sign a Solana transaction
    ///
    /// # Arguments
    ///
    /// * `tx` - The transaction to sign (will be modified in place)
    ///
    /// # Returns
    ///
    /// The signature produced by signing the transaction
    async fn sign_transaction(&self, tx: &mut Transaction) -> Result<Signature, SignerError>;

    /// Sign an arbitrary message
    ///
    /// # Arguments
    ///
    /// * `message` - The message bytes to sign
    ///
    /// # Returns
    ///
    /// The signature produced by signing the message
    async fn sign_message(&self, message: &[u8]) -> Result<Signature, SignerError>;

    /// Check if the signer is available and healthy
    ///
    /// # Returns
    ///
    /// `true` if the signer can be used, `false` otherwise
    async fn is_available(&self) -> bool;
}
