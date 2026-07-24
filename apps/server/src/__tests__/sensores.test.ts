import type { Usuario } from "@forja/core";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { crearComposicionAuthFalsa, crearComposicionRuntimeFalsa } from "./fakes";

const operador: Usuario = {
  id: "usuario-operador",
  email: "operador@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

const supervisor: Usuario = {
  id: "usuario-supervisor",
  email: "supervisor@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Supervisor",
  rol: "supervisor",
  activo: true,
};

function extraerCookie(setCookieHeader: string | string[] | undefined): string | undefined {
  const valor = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return valor?.split(";")[0];
}

async function iniciarSesionComo(app: ReturnType<typeof buildApp>, usuario: Usuario): Promise<string> {
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: usuario.email, contrasena: "correcta" },
  });
  return extraerCookie(login.headers["set-cookie"]) ?? "";
}

const sensorTemp = {
  id: "sensor-temp",
  externalId: "prensa-temp",
  machineId: "maquina-prensa",
  nombre: "Temperatura",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};

function construirApp() {
  const auth = crearComposicionAuthFalsa([operador, supervisor]);
  const runtime = crearComposicionRuntimeFalsa();
  runtime.maquinasRepo.maquinas.set("maquina-prensa", { id: "maquina-prensa", areaId: "area-ensamble", nombre: "Prensa" });
  runtime.maquinasRepo.maquinas.set("maquina-torno", { id: "maquina-torno", areaId: "area-maquinado", nombre: "Torno CNC" });
  runtime.areasUsuarioRepo.asignaciones[operador.id] = ["area-ensamble"];
  runtime.catalogoSensoresRepo.sensores.set(sensorTemp.id, sensorTemp);
  runtime.agregacionesSensoresRepo.lecturas.push(
    { sensorId: sensorTemp.id, ts: new Date("2026-01-02T00:00:00.000Z"), value: 60, fueraDeRango: false },
    { sensorId: sensorTemp.id, ts: new Date("2026-01-03T00:00:00.000Z"), value: 70, fueraDeRango: false },
  );
  const app = buildApp({ auth, runtime });
  return { app, runtime };
}

const QUERY_VALIDA = "agg=avg&bucket=1d&desde=2026-01-01T00:00:00.000Z&hasta=2026-01-08T00:00:00.000Z";

describe("GET /api/sensores/:id/lecturas", () => {
  it("devuelve la serie agregada del sensor para un usuario con acceso", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/${sensorTemp.id}/lecturas?${QUERY_VALIDA}`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(200);
    const cuerpo = respuesta.json();
    expect(cuerpo.serie.sensorId).toBe(sensorTemp.id);
    expect(cuerpo.serie.puntos.length).toBeGreaterThan(0);
  });

  it("un operador de la misma área que la máquina del sensor puede consultarlo", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/${sensorTemp.id}/lecturas?${QUERY_VALIDA}`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(200);
  });

  it("un operador fuera del área de la máquina recibe 403", async () => {
    const { app, runtime } = construirApp();
    const sensorTorno = { ...sensorTemp, id: "sensor-torno", externalId: "torno-temp", machineId: "maquina-torno" };
    runtime.catalogoSensoresRepo.sensores.set(sensorTorno.id, sensorTorno);
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/${sensorTorno.id}/lecturas?${QUERY_VALIDA}`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(403);
  });

  it("sensor inexistente responde 404", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/no-existe/lecturas?${QUERY_VALIDA}`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(404);
  });

  it("rango de más de 90 días responde 400", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/${sensorTemp.id}/lecturas?agg=avg&bucket=1d&desde=2025-01-01T00:00:00.000Z&hasta=2026-01-08T00:00:00.000Z`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(400);
  });

  it("agregación fuera del enum cerrado responde 400 (el LLM/UI nunca elige libremente)", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/${sensorTemp.id}/lecturas?agg=sum&bucket=1d&desde=2026-01-01T00:00:00.000Z&hasta=2026-01-08T00:00:00.000Z`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(400);
  });

  it("sin sesión responde 401", async () => {
    const { app } = construirApp();

    const respuesta = await app.inject({
      method: "GET",
      url: `/api/sensores/${sensorTemp.id}/lecturas?${QUERY_VALIDA}`,
    });

    expect(respuesta.statusCode).toBe(401);
  });
});
