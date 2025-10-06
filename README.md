# solana-signers

**Flexible, framework-agnostic Solana transaction signing for Rust applications**

`solana-signers` provides a unified interface for signing Solana transactions with multiple backend implementations. Whether you need local keypairs for development, enterprise vault integration, or managed wallet services, this library offers a consistent API across all signing methods.

## Features

- 🎯 **Unified Interface**: Single `SolanaSigner` trait for all backends
- ⚡ **Async-First**: Built with `async/await` for modern Rust applications
- 🧩 **Modular**: Feature flags for zero-cost backend selection
- 🛡️ **Type-Safe**: Compile-time guarantees and error handling
- 📦 **Minimal Dependencies**: Only include what you use

## Supported Backends

| Backend | Use Case | Feature Flag |
|---------|----------|--------------|
| **Memory** | Local keypairs, development, testing | `memory` (default) |
| **Vault** | Enterprise key management with HashiCorp Vault | `vault` |
| **Privy** | Embedded wallets with Privy infrastructure | `privy` |
| **Turnkey** | Non-custodial key management via Turnkey | `turnkey` |

## How to import crate

```toml
[dependencies]
# Basic usage (memory signer only)
solana-signers = "0.1"

# With Vault support
solana-signers = { version = "0.1", features = ["vault"] }

# All backends
solana-signers = { version = "0.1", features = ["all"] }
```