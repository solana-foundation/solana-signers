import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/src/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
        testTimeout: 10000, // 10 second timeout for unit tests
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.integration.test.ts'],
        },
    },
});
