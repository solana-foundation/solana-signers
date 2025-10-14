import { p256 } from '@noble/curves/nist.js';
import { bytesToHex } from '@noble/curves/utils.js';
import { describe, expect, test } from 'vitest';

import { ApiKeyStamper } from '../stamper.js';

/**
 * Test fixture with P256 key pair
 */
function getTestKeys() {
    const privateKey = 'c9afa9d845ba75166b5c215767b1d6934e50c3db36e89b127b8a622b120f6721';

    const publicKeyBytes = p256.getPublicKey(Buffer.from(privateKey, 'hex'));
    const publicKey = bytesToHex(publicKeyBytes);

    return { privateKey, publicKey };
}

describe('ApiKeyStamper', () => {
    test('creates valid X-Stamp header with P256 signature', () => {
        const { privateKey, publicKey } = getTestKeys();

        const stamper = new ApiKeyStamper({
            apiPrivateKey: privateKey,
            apiPublicKey: publicKey,
        });

        const messageToSign = 'hello from TKHQ!';
        const stamp = stamper.stamp(messageToSign);

        expect(stamp.stampHeaderName).toBe('X-Stamp');

        const decodedStamp = JSON.parse(Buffer.from(stamp.stampHeaderValue, 'base64url').toString());

        expect(Object.keys(decodedStamp).sort()).toEqual(['publicKey', 'scheme', 'signature']);

        expect(decodedStamp.publicKey).toBe(publicKey);
        expect(decodedStamp.scheme).toBe('SIGNATURE_SCHEME_TK_API_P256');

        // Verify signature is a valid DER hex string
        expect(decodedStamp.signature).toMatch(/^30[0-9a-f]+$/);
        expect(decodedStamp.signature.length).toBeGreaterThan(0);
    });

    test('produces valid signatures for same message', async () => {
        const { privateKey, publicKey } = getTestKeys();

        const stamper = new ApiKeyStamper({
            apiPrivateKey: privateKey,
            apiPublicKey: publicKey,
        });

        const messageToSign = 'test message';
        const stamp1 = stamper.stamp(messageToSign);
        const stamp2 = stamper.stamp(messageToSign);

        const decoded1 = JSON.parse(Buffer.from(stamp1.stampHeaderValue, 'base64url').toString());
        const decoded2 = JSON.parse(Buffer.from(stamp2.stampHeaderValue, 'base64url').toString());

        // ECDSA signatures are non-deterministic, so we just verify they're valid DER format
        expect(decoded1.signature).toMatch(/^30[0-9a-f]+$/);
        expect(decoded2.signature).toMatch(/^30[0-9a-f]+$/);
    });

    test('produces different stamps for different messages', () => {
        const { privateKey, publicKey } = getTestKeys();

        const stamper = new ApiKeyStamper({
            apiPrivateKey: privateKey,
            apiPublicKey: publicKey,
        });

        const stamp1 = stamper.stamp('message 1');
        const stamp2 = stamper.stamp('message 2');

        const decoded1 = JSON.parse(Buffer.from(stamp1.stampHeaderValue, 'base64url').toString());
        const decoded2 = JSON.parse(Buffer.from(stamp2.stampHeaderValue, 'base64url').toString());

        expect(decoded1.signature).not.toBe(decoded2.signature);
    });

    test('encodes stamp as base64url without padding', () => {
        const { privateKey, publicKey } = getTestKeys();

        const stamper = new ApiKeyStamper({
            apiPrivateKey: privateKey,
            apiPublicKey: publicKey,
        });

        const stamp = stamper.stamp('test');

        expect(stamp.stampHeaderValue).not.toMatch(/[+/=]/);

        expect(() => Buffer.from(stamp.stampHeaderValue, 'base64url')).not.toThrow();
    });
});
