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
      // Se mide solo código con lógica: lib + server actions. La UI (shadcn,
      // layouts, providers) se cubre vía E2E, no con coverage unitario.
      include: ['src/lib/**/*.ts', 'src/app/**/actions.ts'],
      exclude: [
        'src/test/**',
        'src/types/**',
        'src/**/*.d.ts',
        // Wrappers triviales del SDK: solo instancian el cliente con cookies.
        'src/lib/supabase/client.ts',
        'src/lib/supabase/server.ts',
        'src/lib/supabase/admin.ts',
      ],
      // Trinquete: nunca bajarlos. Subirlos al cerrar cada fase de TESTING-PLAN.md.
      // Real al calibrar (2026-06-12): 96.5 / 83.8 / 96 / 97 — margen ~5 puntos.
      thresholds: {
        statements: 90,
        branches: 78,
        functions: 90,
        lines: 90,
      },
    },
  },
});
