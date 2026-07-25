import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    passWithNoTests: true,
    // Vitest ignora node_modules/dist/etc por defecto, pero definir `exclude`
    // reemplaza esa lista por completo — se repite aquí y se agrega e2e/
    // (specs de Playwright: mismo patrón *.spec.ts, otro test runner).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
      "e2e/**",
    ],
  },
});
