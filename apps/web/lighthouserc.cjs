/**
 * spec 02-interfaz, Acceptance Criteria: "Lighthouse en la vista de
 * operador (tablet, 4G simulada): rendimiento ≥ 85, accesibilidad ≥ 95,
 * PWA instalable."
 *
 * - "vista de operador" = /chat autenticado, no /iniciar-sesion —
 *   puppeteerScript hace login antes de la auditoría.
 * - "tablet, 4G simulada" = formFactor mobile + screenEmulation con el
 *   ancho aproximado de una tablet 10" en retrato + throttling que
 *   imita el "Slow 4G" de Lighthouse (150ms RTT, ~1.6 Mbps).
 * - "PWA instalable": Lighthouse quitó la categoría "pwa" (y sus
 *   auditorías installable-manifest/service-worker) en la v10+; la
 *   versión empaquetada aquí (12.6.1) no la tiene. Se verifica en
 *   cambio con Playwright (e2e/pwa.spec.ts: manifest servido con los
 *   campos requeridos + el service worker llega a registrarse), no
 *   aquí.
 *
 * apps/server y apps/web deben estar corriendo antes de invocar esto
 * (ver el job "lighthouse" en .github/workflows/ci.yml) — a diferencia
 * de Playwright, aquí no se usa `collect.startServerCommand` porque solo
 * levanta un proceso y este flujo necesita ambos (server + web).
 */
module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3100/chat"],
      numberOfRuns: 1,
      puppeteerScript: "./lighthouse-login.cjs",
      puppeteerLaunchOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      settings: {
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 810,
          height: 1080,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttlingMethod: "simulate",
        throttling: {
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        chromeFlags: "--no-sandbox --disable-setuid-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
