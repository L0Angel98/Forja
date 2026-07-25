import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudantes";

/**
 * "Zoom 200% en tablet: el flujo de reporte sigue completable" (spec
 * 02-interfaz). Playwright no emula el zoom real del navegador; se
 * aproxima reduciendo el viewport a la mitad de un ancho típico de
 * tablet 10" (810px → 405px), que produce el mismo efecto de layout que
 * duplicar el zoom. La regla dura de la spec es "sin scroll horizontal
 * jamás", así que eso es lo que se verifica.
 */
test("con el viewport reducido (≈200% zoom), el formulario de reportar no genera scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 405, height: 700 });
  await iniciarSesion(page, "operador");
  await page.goto("/reportar");

  const [anchoDocumento, anchoViewport] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);

  expect(anchoDocumento).toBeLessThanOrEqual(anchoViewport);

  await expect(page.getByLabel("Tag de máquina")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reportar falla" })).toBeVisible();
});
