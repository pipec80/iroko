import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Configuración limpia siguiendo los hints de la herramienta
  entry: ['src/app/**/page.tsx!', 'src/app/**/layout.tsx!', 'src/components/ui/**/*.{ts,tsx}!'],
  project: ['src/**/*.{ts,tsx}!'],
  ignoreExportsUsedInFile: true,
  ignore: [
    'src/types/database.ts',
    'src/lib/logger.ts',
    'src/lib/validation/**/*.ts',
    'src/components/dashboard/team/team-management.tsx',
    'src/lib/supabase/admin.ts',
  ],
  // Dependencias que son base del boilerplate pero no se usan en páginas aún
  ignoreDependencies: [
    '@hookform/resolvers',
    '@radix-ui/react-dialog',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-slider',
    '@radix-ui/react-slot',
    'ai',
    'date-fns',
    'jose',
    'motion',
    'nanoid',
    'nuqs',
    'react-hook-form',
    'sharp',
    'slugify',
    'tailwindcss-animate',
    'zustand',
    '@eslint/js',
    '@testing-library/dom',
    '@testing-library/react',
    '@total-typescript/ts-reset',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'globals',
    'pino-pretty',
    'shadcn',
    'typescript-eslint',
    'cross-env',
    'tailwindcss',
  ],
  ignoreBinaries: ['supabase'],
};

export default config;
