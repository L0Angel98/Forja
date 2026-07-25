import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import i18next from "eslint-plugin-i18next";
import globals from "globals";

const elementTypes = [
  "core",
  "shared",
  "runtime",
  "tools",
  "rag",
  "llm",
  "db",
  "connectors",
  "scheduler",
  "ui",
  "app-server",
  "app-web",
  "app-ingest",
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "**/storybook-static/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        node: { extensions: [".js", ".ts", ".tsx"], preserveSymlinks: false },
      },
      "boundaries/include": ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"],
      "boundaries/elements": [
        { type: "core", pattern: "packages/core/**" },
        { type: "shared", pattern: "packages/shared/**" },
        { type: "runtime", pattern: "packages/runtime/**" },
        { type: "tools", pattern: "packages/tools/**" },
        { type: "rag", pattern: "packages/rag/**" },
        { type: "llm", pattern: "packages/llm/**" },
        { type: "db", pattern: "packages/db/**" },
        { type: "connectors", pattern: "packages/connectors/**" },
        { type: "scheduler", pattern: "packages/scheduler/**" },
        { type: "ui", pattern: "packages/ui/**" },
        { type: "app-server", pattern: "apps/server/**" },
        { type: "app-web", pattern: "apps/web/**" },
        { type: "app-ingest", pattern: "apps/ingest/**" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "core", allow: ["shared"] },
            { from: "shared", allow: [] },
            { from: "db", allow: ["core", "shared"] },
            { from: "llm", allow: ["core", "shared"] },
            { from: "connectors", allow: ["core", "shared"] },
            { from: "tools", allow: ["core", "shared"] },
            { from: "rag", allow: ["core", "shared", "llm", "db"] },
            { from: "runtime", allow: ["core", "shared", "tools"] },
            { from: "scheduler", allow: ["core", "shared", "runtime"] },
            { from: "ui", allow: ["shared"] },
            {
              from: "app-server",
              allow: elementTypes.filter((t) => !t.startsWith("app-")),
            },
            { from: "app-web", allow: ["shared", "ui"] },
            { from: "app-ingest", allow: ["core", "shared", "db"] },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["packages/ui/**/*.tsx", "apps/web/**/*.tsx"],
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y, i18next },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // "Cero cadenas de texto visibles fuera de i18n" (spec 02-interfaz).
      // mode: jsx-text-only (default de la librería) revisa el texto que
      // cae directo como hijo de un elemento JSX (<p>Texto</p>) — el caso
      // más común y de mayor impacto — sin tocar valores de props de
      // componentes propios (Boton variante="secundario", etc.), que la
      // librería no puede distinguir de forma confiable de texto real y
      // produciría falsos positivos en casi cada prop de tipo enum del
      // design system.
      "i18next/no-literal-string": ["error", { mode: "jsx-text-only" }],
    },
    settings: {
      react: { version: "19" },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Va al final a propósito: en flat config, la última entrada que
    // coincide con un archivo gana. Tests, historias de Storybook y
    // archivos de config son código de desarrollo, no UI que un operador
    // vea — no les aplica ni boundaries ni "cero cadenas fuera de i18n".
    files: [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.test.tsx",
      "**/*.spec.tsx",
      "**/*.config.ts",
      "**/*.config.tsx",
      "**/*.stories.tsx",
      "**/vitest.setup.ts",
      "apps/web/e2e/**",
    ],
    rules: {
      "boundaries/element-types": "off",
      "i18next/no-literal-string": "off",
    },
  },
);
