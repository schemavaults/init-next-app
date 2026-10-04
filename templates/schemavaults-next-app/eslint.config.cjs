
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");
const nextVitals = require('eslint-config-next/core-web-vitals')
const nextTypescript = require('eslint-config-next/typescript')
const { builtinRules } = require("eslint/use-at-your-own-risk");

// ESLint allows one severity per rule, so the core max-lines rule is registered
// again under this plugin to warn and to fail at different file lengths.
const smallModules = {
  rules: { "max-lines": builtinRules.get("max-lines") },
};


module.exports = [
  // Base recommended configs
  js.configs.recommended,

  // NextJS Web Vitals recommended rules
  ...nextVitals,

  ...nextTypescript,

  // Main config
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // Custom overrides
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-key": [
        "error",
        {
          checkFragmentShorthand: true,
          checkKeyMustBeforeSpread: true,
          warnOnDuplicates: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },

  // Keep modules small enough to review (.claude/skills/small-modules):
  // warn above 200 lines, fail above 350. Generated code is exempt.
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: ["src/app/(client)/auth/**"],
    plugins: { "small-modules": smallModules },
    rules: {
      "max-lines": ["warn", { max: 200 }],
      "small-modules/max-lines": ["error", { max: 350 }],
    },
  },

  // Ignore patterns
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js", ".next/**", "out/**", "build/**"],
  },
];
