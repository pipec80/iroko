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
  ignoreDependencies: [
    // Radix UI — usados en src/components/ui/* (knip no detecta imports de barrel exports)
    '@radix-ui/react-dialog',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-slider',
    '@radix-ui/react-slot',
    // Utilidades prod — usados en config files o imports dinámicos, no en src/
    'sharp',
    'tailwindcss-animate',
    // Dev tooling — usados por configs de ESLint / testing / build, no importados en src/
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
    'tailwindcss',
  ],
  ignoreBinaries: ['supabase', 'vercel', 'gitleaks'],
};

export default config;
