import { describe, it } from 'vitest';
import { runSignerIntegrationTest } from '@solana-signers/test-utils';
import { getConfig } from './setup';
import { config } from 'dotenv';
config();

describe('PrivySigner Integration', () => {
    it.skipIf(!process.env.TURNKEY_API_PUBLIC_KEY)('signs transactions with real API', async () => {
        await runSignerIntegrationTest(await getConfig(['signTransaction']));
    });
    it.skipIf(!process.env.TURNKEY_API_PUBLIC_KEY)('signs messages with real API', async () => {
        await runSignerIntegrationTest(await getConfig(['signMessage']));
    });
    it.skipIf(!process.env.TURNKEY_API_PUBLIC_KEY)('simulates transactions with real API', async () => {
        await runSignerIntegrationTest(await getConfig(['simulateTransaction']));
    });
});
