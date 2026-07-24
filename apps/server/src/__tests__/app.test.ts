import { describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { crearComposicionAuthFalsa, crearComposicionRuntimeFalsa } from "./fakes";

describe("GET /api/salud", () => {
  it("responde 200 con estado ok e ingesta=null cuando aún no hubo ningún flush", async () => {
    const app = buildApp({ auth: crearComposicionAuthFalsa(), runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({ method: "GET", url: "/api/salud" });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ estado: "ok", ingesta: null });
  });

  it("expone el lag de ingesta persistido por apps/ingest", async () => {
    const runtime = crearComposicionRuntimeFalsa();
    await runtime.estadoIngesta.actualizar({
      lagMs: 250,
      bufferSize: 12,
      actualizadoEn: new Date("2026-01-01T10:00:00.000Z"),
    });
    const app = buildApp({ auth: crearComposicionAuthFalsa(), runtime });

    const respuesta = await app.inject({ method: "GET", url: "/api/salud" });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      estado: "ok",
      ingesta: { lagMs: 250, bufferSize: 12, actualizadoEn: "2026-01-01T10:00:00.000Z" },
    });
  });
});
