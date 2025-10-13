# @solana-signers (TypeScript)

TypeScript packages for building custom Solana signers compatible with `@solana/kit` and `@solana/signers`

## Quick Example

```typescript
import { SolanaSigner } from '@solana-signers/core';
import { signTransactionMessageWithSigners } from '@solana/signers';

class MyCustomSigner implements SolanaSigner {
    readonly address: Address;

    async isAvailable(): Promise<boolean> {
        return await myBackend.healthCheck();
    }

    async signTransactions(transactions) {
        return await myBackend.sign(transactions);
    }

    async signMessages(messages) {
        return await myBackend.signMessages(messages);
    }
}

const signer = new MyCustomSigner(config);
const transaction = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(privySigner, tx),
    tx /* ... */
);
const signedTx = await signTransactionMessageWithSigners(transaction);
```
(see [test-privy.ts](./scripts/test-privy.ts) for a complete example)

## Packages

| Package | Description |
|---------|-------------|
| [@solana-signers/core](./packages/core) | Core interfaces, types, and utilities for building custom signers |
| [@solana-signers/privy](./packages/privy) | Privy wallet signer implementation |

## Installation

```bash
# Core package (required for building custom signers)
pnpm add @solana-signers/core

# Privy implementation
pnpm add @solana-signers/privy
```
