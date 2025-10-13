use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
use solana_sdk::{hash::Hash, message::Message};
use solana_system_interface::instruction::transfer;

pub fn create_test_transaction(signer: &Keypair) -> Transaction {
    let from = signer.pubkey();
    let to = Pubkey::new_unique();
    let instruction = transfer(&from, &to, 1_000_000);
    let message = Message::new(&[instruction], Some(&from));
    let mut tx = Transaction::new_unsigned(message);
    tx.message.recent_blockhash = Hash::default();
    tx
}
