import { defineConfig, devices } from "@playwright/test";

const PUERTO_WEB = 3100;
const PUERTO_SERVER = 3000;

const SERVIDORES = [
  {
    command: "pnpm --filter @forja/server run start",
    cwd: "../..",
    port: PUERTO_SERVER,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe" as const,
  },
  {
    command: "pnpm run start",
    port: PUERTO_WEB,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe" as const,
  },
];

/**
 * E2E completo: levanta apps/server (con una Postgres real detrás — ver
 * .github/workflows/ci.yml para cómo se aprovisiona en CI) y apps/web
 * (build de producción, no `next dev`, para que Lighthouse/perf y el
 * service worker de Serwist se comporten como en producción real).
 * PLAYWRIGHT_SKIP_WEBSERVER permite correr los tests contra servidores ya
 * levantados a mano en desarrollo local.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PUERTO_WEB}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  ...(process.env.CI ? { workers: 2 } : {}),
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER ? {} : { webServer: SERVIDORES }),
});
