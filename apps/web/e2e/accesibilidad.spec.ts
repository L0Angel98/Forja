import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { iniciarSesion } from "./ayudantes";

const IMPACTOS_BLOQUEANTES = new Set(["critical", "serious"]);

/**
 * "axe-core sin violaciones críticas ni serias en los flujos E2E (bloquea
 * merge)" — spec 02-interfaz, Acceptance Criteria. Violaciones "moderate"/
 * "minor" no bloquean (se registran, pero no fallan la build).
 */
async function verificarSinViolacionesBloqueantes(page: Page): Promise<void> {
  const resultado = await new AxeBuilder({ page }).analyze();
  const bloqueantes = resultado.violations.filter((v) => IMPACTOS_BLOQUEANTES.has(v.impact ?? ""));
  expect(bloqueantes, JSON.stringify(bloqueantes, null, 2)).toEqual([]);
}

test.describe("Accesibilidad (axe-core)", () => {
  test("iniciar sesión", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await verificarSinViolacionesBloqueantes(page);
  });

  test.describe("shell de operador", () => {
    test.beforeEach(async ({ page }) => {
      await iniciarSesion(page, "operador");
    });

    for (const ruta of ["/chat", "/reportar", "/mis-reportes"]) {
      test(ruta, async ({ page }) => {
        await page.goto(ruta);
        await verificarSinViolacionesBloqueantes(page);
      });
    }
  });

  test.describe("shell de supervisor", () => {
    test.beforeEach(async ({ page }) => {
      await iniciarSesion(page, "supervisor");
    });

    for (const ruta of ["/bandeja", "/maquinas"]) {
      test(ruta, async ({ page }) => {
        await page.goto(ruta);
        await verificarSinViolacionesBloqueantes(page);
      });
    }
  });

  test.describe("shell de admin", () => {
    test.beforeEach(async ({ page }) => {
      await iniciarSesion(page, "admin");
    });

    for (const ruta of ["/documentos", "/conectores", "/rutinas", "/workspace"]) {
      test(ruta, async ({ page }) => {
        await page.goto(ruta);
        await verificarSinViolacionesBloqueantes(page);
      });
    }
  });
});
