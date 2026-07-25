import { expect, test } from "@playwright/test";

/**
 * "Instalable" (spec 02-interfaz). Lighthouse quitó la categoría "pwa" y
 * sus auditorías de instalabilidad (installable-manifest, service-worker)
 * en Lighthouse 10+ — confirmado ausente en la versión empaquetada por
 * @lhci/cli aquí (Lighthouse 12.6.1) — así que lighthouserc.js no puede
 * verificarlo. Se verifica en cambio de forma directa: el manifest tiene
 * los campos que un navegador exige para ofrecer "Agregar a inicio", y
 * el service worker (activo solo en el build de producción que corre
 * este E2E, no en `next dev`) llega a registrarse.
 */
test.describe("PWA", () => {
  test("el manifest expone los campos mínimos para ser instalable", async ({ request }) => {
    const respuesta = await request.get("/manifest.webmanifest");
    expect(respuesta.ok()).toBe(true);

    const manifest = await respuesta.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("el service worker se registra en el build de producción", async ({ page }) => {
    await page.goto("/iniciar-sesion");

    const registrado = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registro = await navigator.serviceWorker.ready.catch(() => null);
      return registro !== null;
    });

    expect(registrado).toBe(true);
  });
});
