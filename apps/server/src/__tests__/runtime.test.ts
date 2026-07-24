import type { Usuario } from "@forja/core";
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

function extraerCookie(setCookieHeader: string | string[] | undefined): string | undefined {
  const valor = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return valor?.split(";")[0];
}

async function iniciarSesionComo(
  app: ReturnType<typeof buildApp>,
  usuario: Usuario,
): Promise<string> {
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: usuario.email, contrasena: "correcta" },
  });
  return extraerCookie(login.headers["set-cookie"]) ?? "";
}

describe("GET /api/admin/workspace", () => {
  it("un admin ve la configuración actual", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/workspace", headers: { cookie } });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ soul: "Eres Forja.", advertencias: [], archivosInvalidos: [] });
  });

  it("un operador no tiene acceso", async () => {
    const auth = crearComposicionAuthFalsa([operador]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/workspace", headers: { cookie } });

    expect(respuesta.statusCode).toBe(403);
  });

  it("sin sesión responde 401", async () => {
    const app = buildApp({ auth: crearComposicionAuthFalsa(), runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({ method: "GET", url: "/api/admin/workspace" });

    expect(respuesta.statusCode).toBe(401);
  });
});

describe("PUT /api/admin/workspace/:archivo", () => {
  it("edita soul.md, recarga la config y audita con diff", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/workspace/soul",
      headers: { cookie },
      payload: { contenido: "Eres Forja, versión nueva." },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().diff).toContain("+Eres Forja, versión nueva.");
    expect(runtime.escritorWorkspaceFalso.archivos["soul"]).toBe("Eres Forja, versión nueva.");
    expect(auth.auditoriaRepo.eventos).toContainEqual(
      expect.objectContaining({ tipo: "workspace_editado", usuarioId: admin.id }),
    );
  });

  it("un nombre de archivo inválido responde 400", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/workspace/rutinas",
      headers: { cookie },
      payload: { contenido: "x" },
    });

    expect(respuesta.statusCode).toBe(400);
  });

  it("un operador no puede editar el workspace", async () => {
    const auth = crearComposicionAuthFalsa([operador]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "PUT",
      url: "/api/admin/workspace/soul",
      headers: { cookie },
      payload: { contenido: "intento no autorizado" },
    });

    expect(respuesta.statusCode).toBe(403);
  });
});

describe("sugerencias de memoria", () => {
  it("lista pendientes y permite aprobar", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const sugerenciaId = "11111111-1111-1111-1111-111111111111";
    await runtime.sugerenciasMemoriaRepo.crear({
      id: sugerenciaId,
      contenido: "dato útil",
      estado: "pendiente",
      propuestaEn: new Date(),
    });
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const listado = await app.inject({ method: "GET", url: "/api/admin/memoria/sugerencias", headers: { cookie } });
    expect(listado.statusCode).toBe(200);
    expect(listado.json().sugerencias).toHaveLength(1);

    const aprobar = await app.inject({
      method: "POST",
      url: `/api/admin/memoria/sugerencias/${sugerenciaId}/aprobar`,
      headers: { cookie },
    });
    expect(aprobar.statusCode).toBe(200);
    expect(runtime.escritorMemoriaFalso.entradas).toContain("dato útil");

    const listadoTrasAprobar = await app.inject({
      method: "GET",
      url: "/api/admin/memoria/sugerencias",
      headers: { cookie },
    });
    expect(listadoTrasAprobar.json().sugerencias).toHaveLength(0);
  });

  it("rechazar no escribe en memoria", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const sugerenciaId = "22222222-2222-2222-2222-222222222222";
    await runtime.sugerenciasMemoriaRepo.crear({
      id: sugerenciaId,
      contenido: "dato dudoso",
      estado: "pendiente",
      propuestaEn: new Date(),
    });
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const respuesta = await app.inject({
      method: "POST",
      url: `/api/admin/memoria/sugerencias/${sugerenciaId}/rechazar`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(runtime.escritorMemoriaFalso.entradas).toHaveLength(0);
  });

  it("aprobar una sugerencia inexistente responde 404", async () => {
    const auth = crearComposicionAuthFalsa([admin]);
    const runtime = crearComposicionRuntimeFalsa();
    const app = buildApp({ auth, runtime });
    const cookie = await iniciarSesionComo(app, admin);

    const idInexistente = "00000000-0000-0000-0000-000000000000";
    const respuesta = await app.inject({
      method: "POST",
      url: `/api/admin/memoria/sugerencias/${idInexistente}/aprobar`,
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(404);
  });
});
