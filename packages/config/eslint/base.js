const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");
const globals = require("globals");

/**
 * Base ESLint config (flat config) compartilhada entre apps/api e apps/web.
 * Cada app estende este arquivo e adiciona regras/plugins específicos
 * (ex: eslint-plugin-react, @next/eslint-plugin-next).
 */
module.exports = tseslint.config(
  {
    ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**", "eslint.config.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
