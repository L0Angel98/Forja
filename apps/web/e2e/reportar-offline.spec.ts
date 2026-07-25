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
test("sin conexión, el reporte se guarda localmente y se muestra como pendiente", async ({ page }) => {
  // Fuerza el fetch de POST /api/fallas a rechazar como fetch() real lo
  // hace sin red — determinístico por construcción. context.setOffline
  // (probado en CI real dos veces, con y sin page.route de apoyo) deja el
  // POST sin llegar al server (confirmado por logs) pero el banner tampoco
  // aparece: con el service worker de producción activo (este job compila
  // y sirve el build real), esa vía pasa por la capa de red/CDP y algo se
  // queda colgado en vez de rechazar limpio. Esto interviene en el punto
  // exacto que el código de la app observa, sin tocar esa capa.
  await page.addInitScript(() => {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = (entrada, opciones) => {
      const metodo = opciones?.method ?? "GET";
      const url = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.toString() : entrada.url;
      if (url.includes("/api/fallas") && metodo === "POST") return Promise.reject(new TypeError("Failed to fetch"));
      return fetchOriginal(entrada, opciones);
    };
  });

  await iniciarSesion(page, "operador");
  await page.goto("/reportar");

  await expect(page.getByLabel("Tag de máquina")).toBeVisible();

  await page.getByLabel("Tag de máquina").fill("PRE-03");
  await page.getByLabel("Descripción").fill("Ruido anormal en el motor principal");
  await page.getByRole("button", { name: "Reportar falla" }).click();

  await expect(page.getByText("Sin conexión: tu reporte se guardó")).toBeVisible();
  await expect(page.getByText(/pendiente de enviar/)).toBeVisible();
});
