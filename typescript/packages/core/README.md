# @solana-signers/core

Core interfaces and utilities for building external Solana signers.

## Installation

```bash
pnpm add @solana-signers/core
```

## What's Included

### Interfaces

**`SolanaSigner`** - Unified interface that all signer implementations extend:

```typescript
import { SolanaSigner } from '@solana-signers/core';

interface SolanaSigner {
    address: Address;
    isAvailable(): Promise<boolean>;
    signMessages(messages: readonly SignableMessage[]): Promise<readonly SignatureDictionary[]>;
    signTransactions(transactions: readonly Transaction[]): Promise<readonly SignatureDictionary[]>;
}
```

### Error Handling

```typescript
import { SignerError, SignerErrorCode, throwSignerError } from '@solana-signers/core';

// Check error type
if (error instanceof SignerError) {
    console.log(error.code); // e.g., 'SIGNER_SIGNING_FAILED'
    console.log(error.context); // Additional error details
}

// Throw typed errors
throwSignerError(SignerErrorCode.SIGNING_FAILED, {
    address: 'signer-address',
    message: 'Custom error message'
});
```

**Available error codes:**
- `INVALID_PRIVATE_KEY` - Invalid private key format
- `INVALID_PUBLIC_KEY` - Invalid public key format
- `SIGNING_FAILED` - Signing operation failed
- `REMOTE_API_ERROR` - Remote signer API error
- `HTTP_ERROR` - HTTP request failed
- `SERIALIZATION_ERROR` - Transaction serialization failed
- `CONFIG_ERROR` - Invalid configuration
- `NOT_AVAILABLE` - Signer not available/healthy
- `IO_ERROR` - File I/O error
- `PRIVY_NOT_INITIALIZED` - Privy signer not initialized

### Utilities

**`extractSignatureFromWireTransaction`** - Extract a specific signer's signature from a signed transaction:

```typescript
import { extractSignatureFromWireTransaction } from '@solana-signers/core';

// When a remote API returns a fully signed base64 transaction, we need to extract the signature to use Kit's native methods (which rely on .signTransactions to return a SignatureDictionary)
const signedTx = await remoteApi.signTransaction(...);
const sigDict = extractSignatureFromWireTransaction({
    base64WireTransaction: signedTx,
    signerAddress: myAddress
});
```

**`createSignatureDictionary`** - Create a signature dictionary from raw signature bytes:

```typescript
import { createSignatureDictionary } from '@solana-signers/core';

const sigDict = createSignatureDictionary({
    signature: signatureBytes,
    signerAddress: myAddress
});
```

## Usage

This package is typically used as a dependency when building custom signer implementations. See [@solana-signers/privy](https://www.npmjs.com/package/@solana-signers/privy) for an example implementation.

```typescript
import { SolanaSigner, SignerErrorCode, throwSignerError } from '@solana-signers/core';

class MyCustomSigner implements SolanaSigner {
    readonly address: Address;

    async isAvailable(): Promise<boolean> {
        // Check if backend is healthy
    }

    async signMessages(messages: readonly SignableMessage[]) {
        // Sign messages using your backend
    }

    async signTransactions(transactions: readonly Transaction[]) {
        // Sign transactions using your backend
    }
}
```
