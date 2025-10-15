use crate::sdk_adapter::{Hash, RpcClient, RpcRequest, Transaction};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::json;
use std::env;
use std::error::Error;

pub const SOLANA_RPC_URL: &str = "SOLANA_RPC_URL";
pub const LOCAL_VALIDATOR_RPC_URL: &str = "http://localhost:8899";

pub async fn get_latest_blockhash() -> Result<Hash, Box<dyn Error>> {
    let rpc_url = env::var(SOLANA_RPC_URL).unwrap_or_else(|_| LOCAL_VALIDATOR_RPC_URL.to_string());

    let client = RpcClient::new(rpc_url);

    let blockhash = client.get_latest_blockhash().await.unwrap();

    Ok(blockhash)
}

pub async fn send_transaction(transaction: &Transaction) -> Result<(), Box<dyn Error>> {
    let rpc_url = env::var(SOLANA_RPC_URL).unwrap_or_else(|_| LOCAL_VALIDATOR_RPC_URL.to_string());

    let client = RpcClient::new(rpc_url);

    let tx_bytes = bincode::serialize(transaction).expect("Failed to serialize transaction");
    let tx_base64 = STANDARD.encode(&tx_bytes);

    // Send transaction via raw RPC call
    let response: serde_json::Value = client
        .send(
            RpcRequest::SimulateTransaction,
            json!([tx_base64, {"encoding": "base64"}]),
        )
        .await
        .expect("Failed to submit transaction to validator");

    if let Some(value) = response.get("value") {
        if let Some(err) = value.get("err") {
            if !err.is_null() {
                return Err(format!("Transaction failed: {}", err).into());
            }
        }
    }

    Ok(())
}
