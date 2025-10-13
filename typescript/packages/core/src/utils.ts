import { Address, assertIsAddress } from '@solana/addresses';
import { getBase64Encoder } from '@solana/codecs-strings';
import { SignatureBytes } from '@solana/keys';
import { SignatureDictionary } from '@solana/signers';
import { Base64EncodedWireTransaction, getTransactionDecoder } from '@solana/transactions';

import { SignerErrorCode, throwSignerError } from './errors.js';

interface ExtractSignatureFromWireTransactionOptions {
    base64WireTransaction: Base64EncodedWireTransaction;
    signerAddress: Address;
}

/**
 * Extracts a specific signer's signature from a base64-encoded wire transaction.
 * Useful for remote signers that return fully signed transactions from their APIs.
 *
 * @param base64WireTransaction - Base64 encoded transaction string
 * @param signerAddress - The address of the signer whose signature to extract
 * @returns SignatureDictionary with only the specified signer's signature
 * @throws {SignerError} If no signature is found for the given address
 *
 * @example
 * ```typescript
 * // Privy API returns a signed transaction
 * const signedTx = await privyApi.signTransaction(...);
 * const sigDict = extractSignatureFromWireTransaction(signedTx, this.address);
 * ```
 */
export function extractSignatureFromWireTransaction({
    base64WireTransaction,
    signerAddress,
}: ExtractSignatureFromWireTransactionOptions): SignatureDictionary {
    assertIsAddress(signerAddress);
    const encoder = getBase64Encoder();
    const decoder = getTransactionDecoder();
    const transactionBytes = encoder.encode(base64WireTransaction);
    const { signatures } = decoder.decode(transactionBytes);

    const signature = signatures[signerAddress];
    if (!signature) {
        throwSignerError(SignerErrorCode.SIGNING_FAILED, {
            address: signerAddress,
            message: `No signature found for address ${signerAddress}`,
        });
    }

    return createSignatureDictionary({
        signature,
        signerAddress,
    });
}

interface CreateSignatureDictionaryArgs {
    signature: SignatureBytes;
    signerAddress: Address;
}

/**
 * Creates a signature dictionary from a signature and signer address.
 * @param signature - The signature to create the dictionary from
 * @param signerAddress - The address of the signer whose signature to create the dictionary from
 * @returns SignatureDictionary with only the specified signer's signature
 * @throws {SignerError} If no signature is found for the given address
 *
 * @example
 * ```typescript
 * const sigDict = createSignatureDictionary({ signature, signerAddress });
 * ```
 */
export function createSignatureDictionary({
    signature,
    signerAddress,
}: CreateSignatureDictionaryArgs): SignatureDictionary {
    assertIsAddress(signerAddress);
    if (!signature) {
        throwSignerError(SignerErrorCode.SIGNING_FAILED, {
            address: signerAddress,
            message: `No signature found for address ${signerAddress}`,
        });
    }
    return Object.freeze({ [signerAddress]: signature });
}
