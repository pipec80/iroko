import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright specs live in src/test/e2e/ — excluded from unit run.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'src/test/e2e/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/test/**',
        'src/types/**',
        'src/**/*.d.ts',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/page.tsx',
      ],
      thresholds: {
        statements: 5,
        branches: 5,
        functions: 3,
        lines: 5,
      },
    },
  },
});
