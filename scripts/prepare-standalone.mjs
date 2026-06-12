/**
 * Copia `public/` y `.next/static/` dentro de `.next/standalone/`.
 *
 * El modo `output: 'standalone'` de Next.js no incluye estos directorios:
 * https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
 *
 * Sin esta copia, `node .next/standalone/server.js` (el `pnpm start` que usa
 * Playwright en CI) sirve la app sin chunks JS ni assets de public/: React
 * nunca hidrata y cada request de favicon/manifest cae al app router y
 * dispara notFound() (los errores NEXT_HTTP_ERROR_FALLBACK;404 en el log).
 */
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.log('[prepare-standalone] .next/standalone no existe — nada que copiar.');
  process.exit(0);
}

cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {
  recursive: true,
});

console.log('[prepare-standalone] public/ y .next/static copiados a .next/standalone/');
