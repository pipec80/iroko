import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettierConfig from "eslint-config-prettier"
import unicorn from "eslint-plugin-unicorn"
import noSecrets from "eslint-plugin-no-secrets"

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,

  // ──────────────────────────────────────────────────────────────
  // no-secrets: detecta credentials y tokens hardcodeados en código
  // ──────────────────────────────────────────────────────────────
  {
    plugins: { "no-secrets": noSecrets },
    rules: {
      "no-secrets/no-secrets": ["error", { tolerance: 4.5 }],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // unicorn: reglas de calidad y corrección de bugs comunes
  // ──────────────────────────────────────────────────────────────
  {
    plugins: { unicorn },
    rules: {
      "unicorn/no-array-for-each": "error",
      "unicorn/no-for-loop": "error",
      "unicorn/prefer-includes": "error",
      "unicorn/prefer-string-slice": "error",
      "unicorn/prefer-optional-catch-binding": "error",
      "unicorn/no-useless-undefined": "error",
      "unicorn/prefer-number-properties": "error",
      "unicorn/throw-new-error": "error",
      "unicorn/no-instanceof-array": "error",
      "unicorn/prefer-type-error": "error",
      "unicorn/error-message": "error",
    },
  },

  // ──────────────────────────────────────────────────────────────
  // @typescript-eslint adicional (estricto)
  // ──────────────────────────────────────────────────────────────
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Ignorar directorios globales
  // ──────────────────────────────────────────────────────────────
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "public/**",
    "dist/**",
    "cypress/**",
    "jest/**",
  ]),
])

export default eslintConfig
