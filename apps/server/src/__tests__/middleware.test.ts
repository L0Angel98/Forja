import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import { describe, expect, it } from "vitest";
import type { Usuario } from "@forja/core";
import { requiereRol } from "../auth/middleware";
import { NOMBRE_COOKIE_SESION } from "../auth/cookie";
import { crearComposicionAuthFalsa } from "./fakes";

const supervisor: Usuario = {
  id: "usuario-sup",
  email: "supervisor@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Supervisor",
  rol: "supervisor",
  activo: true,
};

const operador: Usuario = {
  id: "usuario-op",
  email: "operador@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

function construirAppDePrueba(usuarios: Usuario[]) {
  const auth = crearComposicionAuthFalsa(usuarios);
  const app = Fastify();
  app.register(fastifyCookie);
  app.get("/solo-supervisor", { preHandler: requiereRol(auth, "supervisor", "admin") }, async () => ({
    ok: true,
  }));
  return { app, auth };
}

async function loginYObtenerCookie(
  auth: ReturnType<typeof construirAppDePrueba>["auth"],
  usuario: Usuario,
): Promise<string> {
  const sesionId = auth.generarIdSesion();
  await auth.sesiones.crear({
    id: sesionId,
    usuarioId: usuario.id,
    dispositivoCompartido: false,
    creadaEn: new Date(),
    ultimaActividadEn: new Date(),
  });
  return `${NOMBRE_COOKIE_SESION}=${sesionId}`;
}

describe("requiereRol", () => {
  it("un rol permitido puede acceder", async () => {
    const { app, auth } = construirAppDePrueba([supervisor]);
    const cookie = await loginYObtenerCookie(auth, supervisor);

    const respuesta = await app.inject({ method: "GET", url: "/solo-supervisor", headers: { cookie } });

    expect(respuesta.statusCode).toBe(200);
  });

  it("un operador no tiene acceso a una ruta restringida a supervisor/admin", async () => {
    const { app, auth } = construirAppDePrueba([operador]);
    const cookie = await loginYObtenerCookie(auth, operador);

    const respuesta = await app.inject({ method: "GET", url: "/solo-supervisor", headers: { cookie } });

    expect(respuesta.statusCode).toBe(403);
  });

  it("sin sesión responde 401 antes de evaluar el rol", async () => {
    const { app } = construirAppDePrueba([]);

    const respuesta = await app.inject({ method: "GET", url: "/solo-supervisor" });

    expect(respuesta.statusCode).toBe(401);
  });
});
