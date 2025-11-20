import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/src/**/*.integration.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        testTimeout: 30000, // 30 second timeout for integration tests
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.integration.test.ts'],
        },
    },
});
