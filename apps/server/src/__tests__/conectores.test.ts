import { ConectorNoDisponible, crearClienteMcpFalso, type Usuario } from "@forja/core";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { crearComposicionAuthFalsa, crearComposicionRuntimeFalsa } from "./fakes";

const admin: Usuario = {
  id: "usuario-admin",
  email: "admin@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Admin",
  rol: "admin",
  activo: true,
};

const supervisor: Usuario = { ...admin, id: "usuario-sup", email: "sup@planta.mx", rol: "supervisor" };
const operador: Usuario = { ...admin, id: "usuario-op", email: "op@planta.mx", rol: "operador" };

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

function sembrarConectorActivo(
  runtime: ReturnType<typeof crearComposicionRuntimeFalsa>,
  overrides: Partial<{ resultado: string; falla: Error }> = {},
) {
  const cliente = crearClienteMcpFalso(
    [],
    overrides.falla ? {} : { crear_evento: overrides.resultado ?? "Evento creado: abc123" },
  );
  if (overrides.falla) {
    cliente.invocar = async () => {
      throw overrides.falla;
    };
  }
  runtime.conectoresFalso.activos.set("google-calendar", {
    manifiesto: {
      nombre: "google-calendar",
      version: "1.0.0",
      herramientas: [{ nombre: "crear_evento", descripcion: "x", esEscritura: true, schemaEntrada: {} }],
    },
    permisos: { crear_evento: ["supervisor", "admin"] },
    cliente,
  });
  return cliente;
}

describe("GET /api/admin/conectores", () => {
  it("un admin ve el estado de los conectores", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    runtime.conectoresFalso.estados.push({ nombre: "google-calendar", estado: "disponible", error: null });
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/conectores", headers: { cookie } });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ conectores: [{ nombre: "google-calendar", estado: "disponible", error: null }] });
  });

  it("un operador no tiene acceso", async () => {
    const auth = crearComposicionAuthFalsa([operador]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/conectores", headers: { cookie } });

    expect(respuesta.statusCode).toBe(403);
  });
});

describe("POST /api/conectores/:conector/:herramienta/confirmar", () => {
  it("un supervisor con permiso confirma y el cliente MCP real se invoca", async () => {
    const auth = crearComposicionAuthFalsa([supervisor]);
    const runtime = crearComposicionRuntimeFalsa();
    const cliente = sembrarConectorActivo(runtime);
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/conectores/google-calendar/crear_evento/confirmar",
      headers: { cookie },
      payload: { parametros: { titulo: "Mantenimiento" } },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ resultado: "Evento creado: abc123" });
    expect(cliente.invocaciones).toEqual([{ nombre: "crear_evento", parametros: { titulo: "Mantenimiento" } }]);
  });

  it("un operador sin permiso configurado para esa herramienta recibe 403", async () => {
    const auth = crearComposicionAuthFalsa([operador]);
    const runtime = crearComposicionRuntimeFalsa();
    sembrarConectorActivo(runtime);
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/conectores/google-calendar/crear_evento/confirmar",
      headers: { cookie },
      payload: { parametros: {} },
    });

    expect(respuesta.statusCode).toBe(403);
  });

  it("un conector inexistente responde 404", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/conectores/no-existe/algo/confirmar",
      headers: { cookie },
      payload: { parametros: {} },
    });

    expect(respuesta.statusCode).toBe(404);
  });

  it("un conector con el circuito abierto responde 503", async () => {
    const auth = crearComposicionAuthFalsa([supervisor]);
    const runtime = crearComposicionRuntimeFalsa();
    sembrarConectorActivo(runtime, { falla: new ConectorNoDisponible("google-calendar") });
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/conectores/google-calendar/crear_evento/confirmar",
      headers: { cookie },
      payload: { parametros: {} },
    });

    expect(respuesta.statusCode).toBe(503);
  });

  it("un fallo genérico del cliente MCP (p. ej. la API externa) responde 502", async () => {
    const auth = crearComposicionAuthFalsa([supervisor]);
    const runtime = crearComposicionRuntimeFalsa();
    sembrarConectorActivo(runtime, { falla: new Error("Google Calendar respondió 500") });
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/conectores/google-calendar/crear_evento/confirmar",
      headers: { cookie },
      payload: { parametros: {} },
    });

    expect(respuesta.statusCode).toBe(502);
    expect(respuesta.json()).toEqual({ error: "Google Calendar respondió 500" });
  });

  it("sin sesión responde 401", async () => {
    const app = buildApp({ auth: crearComposicionAuthFalsa(), runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/conectores/google-calendar/crear_evento/confirmar",
      payload: { parametros: {} },
    });

    expect(respuesta.statusCode).toBe(401);
  });
});
