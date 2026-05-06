import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Configuración limpia siguiendo los hints de la herramienta
  entry: [
    'src/proxy.ts',
    'src/app/**/page.tsx!',
    'src/app/**/layout.tsx!',
    'src/components/ui/**/*.{ts,tsx}!',
  ],
  project: ['src/**/*.{ts,tsx}!'],
  ignoreExportsUsedInFile: true,
  // Dependencias que son base del boilerplate pero no se usan en páginas aún
  ignoreDependencies: [
    'lucide-react',
    'tailwind-merge',
    'clsx',
    'tw-animate-css',
    'class-variance-authority',
    'tailwindcss',
    'cross-env',
  ],
};

export default config;
