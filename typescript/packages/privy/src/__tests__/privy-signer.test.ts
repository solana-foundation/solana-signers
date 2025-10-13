import { generateKeyPair, signBytes } from '@solana/keys';
import { createSignableMessage, createSignerFromKeyPair, generateKeyPairSigner } from '@solana/signers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrivySigner } from '../privy-signer.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('PrivySigner', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });
    const mockConfig = {
        apiBaseUrl: 'https://api.privy.test',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        walletId: 'test-wallet-id',
    };

    const setupMockWalletResponse = (address: string) => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            json: () =>
                Promise.resolve({
                    address,
                    chain_type: 'solana',
                    id: mockConfig.walletId,
                }),
            ok: true,
            status: 200,
        });
    };

    const setupMockSignMessageResponse = (signatureBase64: string) => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            json: () =>
                Promise.resolve({
                    data: {
                        encoding: 'base64',
                        signature: signatureBase64,
                    },
                    method: 'signMessage',
                }),
            ok: true,
            status: 200,
        });
    };

    describe('create', () => {
        it('creates and initializes a PrivySigner', async () => {
            const keyPair = await generateKeyPairSigner();

            setupMockWalletResponse(keyPair.address);

            const signer = await PrivySigner.create(mockConfig);

            expect(signer.address).toBeTruthy();
            expect(typeof signer.address).toBe('string');
        });

        it('sets address field correctly from API response', async () => {
            const keyPair = await generateKeyPairSigner();

            setupMockWalletResponse(keyPair.address);

            const signer = await PrivySigner.create(mockConfig);

            expect(signer.address).toBe(keyPair.address);
        });

        it('throws error on API failure', async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: () => Promise.resolve('Unauthorized'),
            });

            await expect(PrivySigner.create(mockConfig)).rejects.toThrow();
        });

        it('throws error on invalid public key', async () => {
            setupMockWalletResponse('not-a-valid-address');

            await expect(PrivySigner.create(mockConfig)).rejects.toThrow();
        });
    });

    describe('signMessages', () => {
        it('signs a message via Privy API', async () => {
            const keyPair = await generateKeyPair();
            const keyPaierSigner = await createSignerFromKeyPair(keyPair);
            const address = keyPaierSigner.address;

            setupMockWalletResponse(address);

            const signer = await PrivySigner.create(mockConfig);

            const messageContent = new Uint8Array([1, 2, 3, 4]);
            const signature = await signBytes(keyPair.privateKey, messageContent);

            const signatureBase64 = Buffer.from(signature).toString('base64');
            setupMockSignMessageResponse(signatureBase64);

            const message = createSignableMessage(messageContent);
            const [sigDict] = await signer.signMessages([message]);
            expect(sigDict).toBeTruthy();
            expect(sigDict?.[signer.address]).toBeTruthy();
        });
    });

    describe('signTransactions', () => {
        it('handles API errors during transaction signing', async () => {
            const keyPair = await generateKeyPairSigner();

            setupMockWalletResponse(keyPair.address);

            const signer = await PrivySigner.create(mockConfig);

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal server error'),
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockTx: any = {
                messageBytes: new Uint8Array([1, 2, 3, 4]),
            };

            await expect(signer.signTransactions([mockTx])).rejects.toThrow();
        });
    });

    describe('isAvailable', () => {
        it('returns true when API is reachable', async () => {
            const keyPair = await generateKeyPairSigner();
            setupMockWalletResponse(keyPair.address);
            const signer = await PrivySigner.create(mockConfig);
            setupMockWalletResponse(keyPair.address);
            const available = await signer.isAvailable();
            expect(available).toBe(true);
        });

        it('returns false when API is unreachable', async () => {
            const keyPair = await generateKeyPairSigner();
            setupMockWalletResponse(keyPair.address);
            const signer = await PrivySigner.create(mockConfig);
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Server error'),
            });
            const available = await signer.isAvailable();
            expect(available).toBe(false);
        });
    });
});
