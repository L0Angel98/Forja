import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudantes";

/**
 * Casos de uso explícitos de la spec 02-interfaz:
 * "Operador entra → aterriza en chat de pantalla completa; no ve
 * navegación de admin." / "Supervisor entra → aterriza en bandeja de
 * pendientes de aprobación."
 */
test.describe("Enrutamiento por rol", () => {
  test("operador entra y aterriza en chat de pantalla completa, sin navegación de admin", async ({ page }) => {
    await iniciarSesion(page, "operador");

    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByRole("link", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reportar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mis reportes" })).toBeVisible();

    for (const etiquetaAdmin of ["Documentos", "Conectores", "Rutinas", "Workspace", "Bandeja", "Máquinas"]) {
      await expect(page.getByRole("link", { name: etiquetaAdmin })).toHaveCount(0);
    }
  });

  test("supervisor entra y aterriza en la bandeja de pendientes", async ({ page }) => {
    await iniciarSesion(page, "supervisor");

    await expect(page).toHaveURL(/\/bandeja$/);
    await expect(page.getByRole("heading", { name: "Bandeja de pendientes" })).toBeVisible();
  });

  test("un operador que navega manualmente a una ruta de admin es redirigido a su propia sección", async ({ page }) => {
    await iniciarSesion(page, "operador");

    await page.goto("/documentos");

    await expect(page).toHaveURL(/\/chat$/);
  });
});
