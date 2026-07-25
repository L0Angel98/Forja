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

  // Espera a que el formulario real esté listo (GuardiaRol ya resolvió la
  // sesión vía /api/auth/me) antes de cortar la red: si se corta antes,
  // ese mismo chequeo de sesión falla por falta de red y GuardiaRol
  // redirige a /iniciar-sesion, y el test nunca llega a ver el formulario.
  await expect(page.getByLabel("Tag de máquina")).toBeVisible();

  // page.route asegura que el POST falle de forma determinista e inmediata
  // (a diferencia de context.setOffline, cuya propagación al fetch en
  // curso puede demorar unos instantes bajo carga de CI); setOffline se
  // mantiene además por fidelidad con el escenario "sin conexión" real.
  await page.route("**/api/fallas", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue(),
  );
  await context.setOffline(true);

  await page.getByLabel("Tag de máquina").fill("PRE-03");
  await page.getByLabel("Descripción").fill("Ruido anormal en el motor principal");
  await page.getByRole("button", { name: "Reportar falla" }).click();

  await expect(page.getByText("Sin conexión: tu reporte se guardó")).toBeVisible();
  await expect(page.getByText(/pendiente de enviar/)).toBeVisible();

  await context.setOffline(false);
});
