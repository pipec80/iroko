import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Glob explícito para evitar que fast-glob interprete [locale], [slug], etc.
    // como clases de caracteres en Windows. Ver: https://github.com/mrmlnc/fast-glob#pattern-syntax
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Playwright specs live in src/test/e2e/ — excluded from unit run.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'src/test/e2e/**'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
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
        branches: 4,
        functions: 3,
        lines: 5,
      },
    },
  },
});
