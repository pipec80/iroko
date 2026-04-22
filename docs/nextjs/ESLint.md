# ESLint in Next.js 16

Next.js 16 introduces significant changes to the linting workflow, primarily focusing on the removal of `next lint` and the full adoption of the ESLint CLI and Flat Config.

## 1. Removal of `next lint`

Starting with version 16, the command `next lint` is no longer supported. The linter should now be run directly using the ESLint CLI.

### Updated Scripts (`package.json`)

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## 2. Flat Config (`eslint.config.mjs`)

We use the new ESLint Flat Config system. Our configuration integrates Next.js recommended rules with additional security plugins.

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noSecrets from "eslint-plugin-no-secrets";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "no-secrets": noSecrets,
    },
    rules: {
      "no-secrets/no-secrets": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

## 3. Recommended Plugins

- **`eslint-config-next/core-web-vitals`**: Upgrades rules that impact Core Web Vitals from warnings to errors.
- **`eslint-config-next/typescript`**: Adds TypeScript-specific linting rules.
- **`eslint-plugin-no-secrets`**: Prevents accidental leakage of credentials or tokens in the codebase.

## 4. Lint-staged Integration

For running lint on staged files (via Husky), use the following configuration in `.lintstagedrc.js`:

```js
const path = require("path");

const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames
    .map((f) => `"${path.relative(process.cwd(), f)}"`)
    .join(" ")}`;

module.exports = {
  "*.{js,jsx,ts,tsx}": [buildEslintCommand],
};
```
