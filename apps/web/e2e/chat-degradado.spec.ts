import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudantes";

/**
 * En CI no hay ANTHROPIC_API_KEY configurada (ni debería haberla: no hay
 * presupuesto de LLM real para E2E) — el server ya degrada este caso a
 * propósito (apps/server/src/runtime/composicion.ts: sin la env var, usa
 * ProveedorLLMNoConfigurado) devolviendo `exitoso: false` en vez de un
 * error HTTP. Esto ejercita exactamente el caso de uso de la spec:
 * "LLM caído → banner discreto + acceso directo al formulario. El
 * operador nunca queda bloqueado."
 */
test("LLM no disponible: el chat muestra un banner discreto en vez de fallar en silencio", async ({ page }) => {
  await iniciarSesion(page, "operador");
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByLabel("Escribe un mensaje…").fill("¿Cuál es el estado de PRE-03?");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText("El asistente de IA no está disponible")).toBeVisible();
  // El acceso directo al formulario manual sigue ahí, siempre visible.
  await expect(page.getByRole("link", { name: "Reportar" })).toBeVisible();
});
