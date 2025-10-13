import { Address, assertIsAddress } from '@solana/addresses';
import { getBase64Decoder, getBase64Encoder, getUtf8Encoder } from '@solana/codecs-strings';
import { SignatureBytes } from '@solana/keys';
import { SignableMessage, SignatureDictionary } from '@solana/signers';
import {
    Base64EncodedWireTransaction,
    getBase64EncodedWireTransaction,
    Transaction,
    TransactionMessageBytesBase64,
    TransactionWithinSizeLimit,
    TransactionWithLifetime,
} from '@solana/transactions';
import {
    createSignatureDictionary,
    extractSignatureFromWireTransaction,
    SignerErrorCode,
    SolanaSigner,
    throwSignerError,
} from '@solana-signers/core';

import {
    SignatureBytesBase64,
    SignMessageRequest,
    SignMessageResponse,
    SignTransactionRequest,
    SignTransactionResponse,
    WalletResponse,
} from './types.js';

/**
 * Configuration for creating a PrivySigner
 */
export interface PrivySignerConfig {
    /** Privy application ID */
    appId: string;
    /** Privy application secret */
    appSecret: string;
    /** Privy wallet ID */
    walletId: string;
    /** Optional custom API base URL (defaults to https://api.privy.io/v1) */
    apiBaseUrl?: string;
}

/**
 * Privy-based signer using Privy's wallet API
 *
 * Note: Must initialize with create() to fetch the public key
 */
export class PrivySigner<TAddress extends string = string> implements SolanaSigner<TAddress> {
    readonly address!: Address<TAddress>;
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly walletId: string;
    private readonly apiBaseUrl: string;
    private initialized: boolean = false;

    private constructor(config: PrivySignerConfig) {
        this.appId = config.appId;
        this.appSecret = config.appSecret;
        this.walletId = config.walletId;
        this.apiBaseUrl = config.apiBaseUrl || 'https://api.privy.io/v1';
    }

    /**
     * Create and initialize a PrivySigner
     * Fetches the public key from Privy API during initialization
     */
    static async create<TAddress extends string = string>(config: PrivySignerConfig): Promise<PrivySigner<TAddress>> {
        const signer = new PrivySigner<TAddress>(config);
        const address = await signer.fetchPublicKey();
        // Use Object.defineProperty to set readonly field after construction
        Object.defineProperty(signer, 'address', {
            configurable: false,
            enumerable: true,
            value: address,
            writable: false,
        });
        signer.initialized = true;
        return signer;
    }

    /**
     * Get the Basic Auth header value
     */
    private getAuthHeader(): string {
        const credentials = `${this.appId}:${this.appSecret}`;
        const base64decoder = getBase64Decoder();
        const credentialsBytes = getUtf8Encoder().encode(credentials);
        return `Basic ${base64decoder.decode(credentialsBytes)}`;
    }

    /**
     * Fetch the public key from Privy API
     */
    private async fetchPublicKey(): Promise<Address<TAddress>> {
        const url = `${this.apiBaseUrl}/wallets/${this.walletId}`;

        const response = await fetch(url, {
            headers: {
                Authorization: this.getAuthHeader(),
                'privy-app-id': this.appId,
            },
            method: 'GET',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Failed to read error response');
            throwSignerError(SignerErrorCode.REMOTE_API_ERROR, {
                message: `Privy API error: ${response.status}`,
                response: errorText,
                status: response.status,
            });
        }

        const walletInfo = (await response.json()) as WalletResponse<TAddress>;
        assertIsAddress(walletInfo.address);
        return walletInfo.address;
    }

    /**
     * Get the signature bytes from a base64 encoded signature
     * @param signature - The base64 encoded signature
     * @returns The signature bytes
     */
    private getSignatureBytes(signature: SignatureBytesBase64): SignatureBytes {
        const encoder = getBase64Encoder();
        const signatureBytes = encoder.encode(signature) as SignatureBytes;
        return signatureBytes;
    }

    /**
     * Sign a base64 encoded wire transaction using Privy API
     * @param base64WireTransaction - The base64 encoded wire transaction to sign
     * @returns The signed base64 encoded wire transaction
     */
    private async signTransaction(
        base64WireTransaction: Base64EncodedWireTransaction,
    ): Promise<Base64EncodedWireTransaction> {
        const url = `${this.apiBaseUrl}/wallets/${this.walletId}/rpc`;

        const request: SignTransactionRequest = {
            method: 'signTransaction',
            params: {
                encoding: 'base64',
                transaction: base64WireTransaction,
            },
        };

        const response = await fetch(url, {
            body: JSON.stringify(request),
            headers: {
                Authorization: this.getAuthHeader(),
                'Content-Type': 'application/json',
                'privy-app-id': this.appId,
            },
            method: 'POST',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Failed to read error response');
            throwSignerError(SignerErrorCode.REMOTE_API_ERROR, {
                message: `Privy API signing error: ${response.status}`,
                response: errorText,
                status: response.status,
            });
        }

        const signResponse = (await response.json()) as SignTransactionResponse;
        return signResponse.data.signed_transaction;
    }

    /**
     * Sign a base64 encoded message using Privy API
     * @param base64EncodedMessage - The base64 encoded message to sign
     * @returns The signature bytes
     */
    private async signMessage(base64EncodedMessage: TransactionMessageBytesBase64): Promise<SignatureBytes> {
        const url = `${this.apiBaseUrl}/wallets/${this.walletId}/rpc`;

        const request: SignMessageRequest = {
            method: 'signMessage',
            params: {
                encoding: 'base64',
                message: base64EncodedMessage,
            },
        };

        const response = await fetch(url, {
            body: JSON.stringify(request),
            headers: {
                Authorization: this.getAuthHeader(),
                'Content-Type': 'application/json',
                'privy-app-id': this.appId,
            },
            method: 'POST',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Failed to read error response');
            throwSignerError(SignerErrorCode.REMOTE_API_ERROR, {
                message: `Privy API signing error: ${response.status}`,
                response: errorText,
                status: response.status,
            });
        }

        const signResponse = (await response.json()) as SignMessageResponse;
        return this.getSignatureBytes(signResponse.data.signature);
    }

    /**
     * Sign multiple messages using Privy API 
     * @param messages - The messages to sign
     * @returns The signature dictionaries
     */
    async signMessages(messages: readonly SignableMessage[]): Promise<readonly SignatureDictionary[]> {
        return await Promise.all(
            messages.map(async message => {
                const base64EncodedMessage = getBase64Decoder().decode(
                    message.content,
                ) as TransactionMessageBytesBase64;
                const signatureBytes = await this.signMessage(base64EncodedMessage);
                return createSignatureDictionary({
                    signature: signatureBytes,
                    signerAddress: this.address,
                });
            }),
        );
    }

    /**
     * Sign multiple transactions using Privy API
     * @param transactions - The transactions to sign
     * @returns The signature dictionaries
     */
    async signTransactions(
        transactions: readonly (Transaction & TransactionWithinSizeLimit & TransactionWithLifetime)[],
    ): Promise<readonly SignatureDictionary[]> {
        return await Promise.all(
            transactions.map(async transaction => {
                const wireTransaction = getBase64EncodedWireTransaction(transaction);
                const signedTx = await this.signTransaction(wireTransaction);
                return extractSignatureFromWireTransaction({
                    base64WireTransaction: signedTx,
                    signerAddress: this.address,
                });
            }),
        );
    }

    /**
     * Check if the Privy signer is available
     * @returns True if the Privy signer is available, false otherwise
     */
    async isAvailable(): Promise<boolean> {
        if (!this.initialized) {
            return false;
        }

        try {
            await this.fetchPublicKey();
            return true;
        } catch {
            return false;
        }
    }
}
