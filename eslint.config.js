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
  // The existing screens predate the React Compiler diagnostics in hooks v7.
  // Keep their migration diagnostics visible as warnings; hooks correctness,
  // JS/TS errors and all new screens retain the recommended error levels.
  // This app currently uses React 18 without the React Compiler (vite.config.js).
  {
    files: [
      "src/App.jsx",
      "src/components/library/ExerciseModal.jsx",
      "src/components/training/QuickPlanSetup.jsx",
      "src/context/UserContext.jsx",
      "src/pages/CoachDashboard.jsx",
      "src/pages/CoachInvitation.jsx",
      "src/pages/CoachManagement.jsx",
      "src/pages/DailyCheckIn.jsx",
      "src/pages/DataIntelligencePage.jsx",
      "src/pages/ExerciseHistoryEditor.jsx",
      "src/pages/Goals.jsx",
      "src/pages/HydrationTracker.jsx",
      "src/pages/Onboarding.jsx",
      "src/pages/PhotosLibrary.jsx",
      "src/pages/ProfileSettings.jsx",
      "src/pages/Routines.jsx",
      "src/pages/WeightTracking.jsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/components/coach/CoachPlanModal.jsx"],
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/pages/RegisterTraining.jsx"],
    rules: {
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
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
