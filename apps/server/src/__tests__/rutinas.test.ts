import type { EjecucionRutina, Usuario } from "@forja/core";
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

const operador: Usuario = {
  id: "usuario-operador",
  email: "operador@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

const RUTINA_VALIDA = [
  "---",
  "nombre: resumen-diario",
  "cron: \"0 6 * * *\"",
  "rol: supervisor-lectura",
  "herramientas:",
  "  - consultar_sensores",
  "salida: ui",
  "presupuesto_tokens: 5000",
  "activa: true",
  "---",
  "Resume el estado de la planta.",
].join("\n");

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

describe("GET /api/admin/rutinas", () => {
  it("un admin ve el listado (vacío si no hay rutinas cargadas)", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/rutinas", headers: { cookie } });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ rutinas: [], erroresCarga: [] });
  });

  it("un operador no tiene acceso", async () => {
    const auth = crearComposicionAuthFalsa([operador]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/rutinas", headers: { cookie } });

    expect(respuesta.statusCode).toBe(403);
  });

  it("sin sesión responde 401", async () => {
    const app = buildApp({ auth: crearComposicionAuthFalsa(), runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/rutinas" });

    expect(respuesta.statusCode).toBe(401);
  });
});

describe("GET /api/admin/rutinas/:nombre", () => {
  it("devuelve el contenido crudo del archivo", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    await runtime.escritorRutinasFalso.escribir("resumen-diario", RUTINA_VALIDA);
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/rutinas/resumen-diario",
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ contenido: RUTINA_VALIDA });
  });

  it("responde 404 si la rutina no existe", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/rutinas/no-existe",
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(404);
  });
});

describe("PUT /api/admin/rutinas/:nombre", () => {
  it("valida y escribe una rutina nueva", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/rutinas/resumen-diario",
      headers: { cookie },
      payload: { contenido: RUTINA_VALIDA },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().rutina).toMatchObject({ nombre: "resumen-diario", activa: true });
    expect(runtime.escritorRutinasFalso.archivos.get("resumen-diario")).toBe(RUTINA_VALIDA);
  });

  it("rechaza un frontmatter inválido sin escribir el archivo", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/rutinas/resumen-diario",
      headers: { cookie },
      payload: { contenido: "no es un frontmatter válido" },
    });

    expect(respuesta.statusCode).toBe(400);
    expect(runtime.escritorRutinasFalso.archivos.has("resumen-diario")).toBe(false);
  });

  it("rechaza cuando el nombre del frontmatter no coincide con la URL", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/rutinas/otro-nombre",
      headers: { cookie },
      payload: { contenido: RUTINA_VALIDA },
    });

    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json()).toEqual({ error: "rutina_nombre_no_coincide_con_la_url" });
  });

  it("un operador no puede escribir rutinas", async () => {
    const auth = crearComposicionAuthFalsa([operador]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/rutinas/resumen-diario",
      headers: { cookie },
      payload: { contenido: RUTINA_VALIDA },
    });

    expect(respuesta.statusCode).toBe(403);
  });
});

describe("DELETE /api/admin/rutinas/:nombre", () => {
  it("elimina el archivo de la rutina", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    await runtime.escritorRutinasFalso.escribir("resumen-diario", RUTINA_VALIDA);
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "DELETE",
      url: "/api/admin/rutinas/resumen-diario",
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(runtime.escritorRutinasFalso.archivos.has("resumen-diario")).toBe(false);
  });
});

describe("GET /api/admin/rutinas/:nombre/historial", () => {
  it("lista las ejecuciones más recientes primero, respetando el límite", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const base: Omit<EjecucionRutina, "id" | "iniciadaEn"> = {
      rutinaNombre: "resumen-diario",
      plantId: runtime.plantId,
      finalizadaEn: new Date("2026-07-24T06:00:10Z"),
      estado: "exitosa",
      tokensUsados: 100,
      costoUsd: 0.01,
      salida: "ok",
      error: null,
    };
    await runtime.ejecucionesRutinaRepo.crear({ ...base, id: "1", iniciadaEn: new Date("2026-07-22T06:00:00Z") });
    await runtime.ejecucionesRutinaRepo.crear({ ...base, id: "2", iniciadaEn: new Date("2026-07-23T06:00:00Z") });
    await runtime.ejecucionesRutinaRepo.crear({ ...base, id: "3", iniciadaEn: new Date("2026-07-24T06:00:00Z") });
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "GET",
      url: "/api/admin/rutinas/resumen-diario/historial?limite=2",
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(200);
    const ejecuciones = respuesta.json().ejecuciones as EjecucionRutina[];
    expect(ejecuciones.map((e) => e.id)).toEqual(["3", "2"]);
  });
});
