import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import unicorn from 'eslint-plugin-unicorn';
import noSecrets from 'eslint-plugin-no-secrets';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,

  // ──────────────────────────────────────────────────────────────
  // no-secrets: detecta credentials y tokens hardcodeados en código
  // ──────────────────────────────────────────────────────────────
  {
    plugins: { 'no-secrets': noSecrets },
    rules: {
      'no-secrets/no-secrets': ['error', { tolerance: 5.7 }],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // unicorn: reglas de calidad y corrección de bugs comunes
  // ──────────────────────────────────────────────────────────────
  {
    plugins: { unicorn },
    rules: {
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-for-loop': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/error-message': 'error',
    },
  },

  // ──────────────────────────────────────────────────────────────
  // @typescript-eslint adicional (estricto)
  // ──────────────────────────────────────────────────────────────
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Type-checked rules — solo archivos src TS/TSX
  // Más lentas (~10s extra) pero detectan bugs que TypeScript no cubre:
  // floating promises, await en no-promises, async en event handlers
  // ──────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Ignorar directorios globales
  // ──────────────────────────────────────────────────────────────
  globalIgnores([
    '.next/**',
    'coverage/**',
    '.agent/**',
    '.agents/**',
    '.claude/**',
    '.gemini/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'public/**',
    'dist/**',
    'cypress/**',
    'jest/**',
  ]),
]);

export default eslintConfig;
