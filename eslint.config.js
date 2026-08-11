import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "cypress/screenshots",
    "cypress/videos",
  ]),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // Apaga la regla base para evitar duplicados/conflictos
      "no-unused-vars": "off",
      // Usa la de TS (sirve también para JS/JSX en la práctica)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^[A-Z_]",
          caughtErrorsIgnorePattern: "^[A-Z_]",
        },
      ],
    },
  },
  {
    files: [
      "vite.config.js",
      "vitest.config.js",
      "cypress.config.js",
      "playwright.config.js",
      "scripts/**/*.js",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.test.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },
  {
    files: ["cypress/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        cy: "readonly",
        Cypress: "readonly",
        expect: "readonly",
        describe: "readonly",
        it: "readonly",
        beforeEach: "readonly",
      },
    },
  },
]);
