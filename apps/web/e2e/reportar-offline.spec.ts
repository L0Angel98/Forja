import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudantes";

/**
 * "Offline de escritura, solo formulario de fallas: el reporte se guarda
 * en IndexedDB... con indicador visible" (spec 02-interfaz). No se
 * verifica aquí el reenvío exitoso al reconectar porque el tag de máquina
 * usado no corresponde a un id real (no existe un catálogo de máquinas
 * por HTTP hoy — ver apps/web/README.md) y el POST fallaría con 404 igual
 * estando en línea; lo que sí es 100% real y verificable end-to-end es
 * que, sin red, el reporte nunca se pierde y queda visible como
 * pendiente.
 */
test("sin conexión, el reporte se guarda localmente y se muestra como pendiente", async ({ page, context }) => {
  await iniciarSesion(page, "operador");
  await page.goto("/reportar");

  await context.setOffline(true);

  await page.getByLabel("Tag de máquina").fill("PRE-03");
  await page.getByLabel("Descripción").fill("Ruido anormal en el motor principal");
  await page.getByRole("button", { name: "Reportar falla" }).click();

  await expect(page.getByText("Sin conexión: tu reporte se guardó")).toBeVisible();
  await expect(page.getByText(/pendiente de enviar/)).toBeVisible();

  await context.setOffline(false);
});
