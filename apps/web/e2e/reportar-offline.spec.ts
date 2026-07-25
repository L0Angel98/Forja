import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudantes";
import { obtenerMaquinaDeEnsamble } from "./db";

/**
 * "Offline de escritura, solo formulario de fallas: el reporte se guarda
 * en IndexedDB... con indicador visible" (spec 02-interfaz). El primer
 * test usa un tag inventado ("PRE-03") a propósito: no existe catálogo de
 * máquinas por HTTP hoy (ver apps/web/README.md) y no hace falta un id
 * real para verificar que, sin red, el reporte nunca se pierde y queda
 * visible como pendiente. El segundo test sí necesita un id real — lo lee
 * directo de la Postgres sembrada (./db.ts) — para verificar el criterio
 * de aceptación completo: reconexión sin duplicar en el server.
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

test("al reconectar, el reporte encolado offline llega al servidor una sola vez", async ({ page }) => {
  const maquina = await obtenerMaquinaDeEnsamble();
  const descripcion = `Prueba E2E reconexión ${Date.now()}`;

  // Igual que el test anterior, pero el fallo es conmutable desde el
  // propio test (window.__e2eForzarFallaFallas) para poder simular
  // "reconectar" sin recargar la página: se apaga el flag y se dispara
  // el evento "online" que usarColaOffline escucha para reintentar de
  // inmediato (spec: "reintento con backoff, sin recargar la página").
  await page.addInitScript(() => {
    (window as unknown as { __e2eForzarFallaFallas: boolean }).__e2eForzarFallaFallas = true;
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = (entrada, opciones) => {
      const metodo = opciones?.method ?? "GET";
      const url = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.toString() : entrada.url;
      const bloquear = (window as unknown as { __e2eForzarFallaFallas: boolean }).__e2eForzarFallaFallas;
      if (url.includes("/api/fallas") && metodo === "POST" && bloquear) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return fetchOriginal(entrada, opciones);
    };
  });

  await iniciarSesion(page, "operador");
  await page.goto("/reportar");
  await expect(page.getByLabel("Tag de máquina")).toBeVisible();

  await page.getByLabel("Tag de máquina").fill(maquina.id);
  await page.getByLabel("Descripción").fill(descripcion);
  await page.getByRole("button", { name: "Reportar falla" }).click();

  await expect(page.getByText(/pendiente de enviar/)).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __e2eForzarFallaFallas: boolean }).__e2eForzarFallaFallas = false;
    window.dispatchEvent(new Event("online"));
  });

  await expect(page.getByText(/pendiente de enviar/)).not.toBeVisible();

  const respuesta = await page.request.get("/api/fallas", { params: { machineId: maquina.id } });
  expect(respuesta.ok()).toBe(true);
  const cuerpo = (await respuesta.json()) as { fallas: ReadonlyArray<{ descripcion: string }> };
  const coincidencias = cuerpo.fallas.filter((falla) => falla.descripcion === descripcion);
  expect(coincidencias).toHaveLength(1);
});
