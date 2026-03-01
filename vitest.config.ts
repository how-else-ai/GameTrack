import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
    alias: {
      '@game-time-tracker/core': resolve(__dirname, './packages/core/src'),
    },
  },
  resolve: {
    alias: {
      '@game-time-tracker/core': resolve(__dirname, './packages/core/src'),
    },
  },
});
