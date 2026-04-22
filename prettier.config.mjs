/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: "all",
  printWidth: 100,
  bracketSameLine: true,
  arrowParens: "always",
  experimentalTernaries: true,
  plugins: ["prettier-plugin-tailwindcss"],
}

export default config
