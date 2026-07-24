import { describe, expect, it } from "vitest";
import { buildApp } from "../app";

describe("GET /api/salud", () => {
  it("responde 200 con estado ok", async () => {
    const app = buildApp();

    const respuesta = await app.inject({ method: "GET", url: "/api/salud" });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ estado: "ok" });
  });
});
