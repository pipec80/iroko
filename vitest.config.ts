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
  },
});
