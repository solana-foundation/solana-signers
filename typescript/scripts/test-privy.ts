/**
 * Manual test script for PrivySigner with real API credentials
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in credentials
 *   2. pnpm test:privy
 */

import { PrivySigner } from '@solana-signers/privy';
import { assertIsSolanaSigner } from '@solana-signers/core';
import {
    appendTransactionMessageInstructions,
    createSolanaRpc,
    createTransactionMessage,
    getBase64EncodedWireTransaction,
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
} from '@solana/kit';
import { getAddMemoInstruction } from '@solana-program/memo';

import * as dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const REQUIRED_ENV_VARS = ['PRIVY_APP_ID', 'PRIVY_APP_SECRET', 'PRIVY_WALLET_ID', 'SOLANA_RPC_URL'];

function validateEnv() {
    const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please copy .env.example to .env and fill in your credentials');
        process.exit(1);
    }
}

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[1/6] Validating environment');
    validateEnv();
    console.log('  ✓ Environment variables loaded');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[2/6] Creating Privy signer');

    const privySigner = await PrivySigner.create({
        appId: process.env.PRIVY_APP_ID!,
        appSecret: process.env.PRIVY_APP_SECRET!,
        walletId: process.env.PRIVY_WALLET_ID!,
        apiBaseUrl: process.env.PRIVY_API_BASE_URL,
    });
    
    assertIsSolanaSigner(privySigner);

    const truncatedAddress = privySigner.address.slice(0, 4) + '...' + privySigner.address.slice(-4);
    console.log(`  → Address: ${truncatedAddress}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[3/6] Checking signer availability');

    const available = await privySigner.isAvailable();
    console.log(`  → Available: ${available}`);

    if (!available) {
        console.error('  ✗ Signer is not available. Check your credentials.');
        process.exit(1);
    }
    console.log('  ✓ Signer is available');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[4/6] Setting up transaction');

    const instruction = getAddMemoInstruction({
        memo: "Hello, Privy",
    });

    const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!)
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const transaction = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(privySigner, tx),
        tx => appendTransactionMessageInstructions([instruction], tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    );
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[5/6] Signing transaction');

    try {
        const signedTransaction = await signTransactionMessageWithSigners(transaction);
        console.log(`  → Signed transaction:`);
        const signatureAddresses = Object.keys(signedTransaction.signatures);
        const foundSignature = signatureAddresses.find(address => address === privySigner.address.toString());
        console.log(`  → Signature found for Privy signer: ${foundSignature ? 'Yes' : 'No'}`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[6/6] Sending transaction');

        const wireTransaction = await getBase64EncodedWireTransaction(signedTransaction);
        const signature = await rpc.sendTransaction(wireTransaction, {
            encoding: 'base64',
            skipPreflight: true,
        }).send();
        console.log(`  → Transaction sent with signature: ${signature}`);

    } catch (error) {
        console.error('  ✗ Error signing transaction:', error);
        process.exit(1);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✓ Test completed successfully');

}

main().catch(error => {
    console.error('\n✗ Test failed:');
    console.error(error);
    process.exit(1);
});
