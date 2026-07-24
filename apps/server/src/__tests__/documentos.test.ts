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

async function iniciarSesionComo(app: ReturnType<typeof buildApp>, usuario: Usuario): Promise<string> {
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: usuario.email, contrasena: "correcta" },
  });
  return extraerCookie(login.headers["set-cookie"]) ?? "";
}

async function construirMultipart(
  campos: Record<string, string>,
  archivo: { nombre: string; contenido: Buffer; mimetype: string } | null,
): Promise<{ contentType: string; body: Buffer }> {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) form.append(clave, valor);
  if (archivo) {
    form.append("file", new Blob([archivo.contenido], { type: archivo.mimetype }), archivo.nombre);
  }
  const respuesta = new Response(form);
  const contentType = respuesta.headers.get("content-type") ?? "";
  const body = Buffer.from(await respuesta.arrayBuffer());
  return { contentType, body };
}

function construirApp() {
  const auth = crearComposicionAuthFalsa([admin, operador]);
  const runtime = crearComposicionRuntimeFalsa();
  const app = buildApp({ auth, runtime });
  return { app, runtime };
}

describe("POST /api/documentos", () => {
  it("un admin sube un documento, se persiste y se encola la indexación", async () => {
    const { app, runtime } = construirApp();
    const cookie = await iniciarSesionComo(app, admin);
    const { contentType, body } = await construirMultipart(
      { maquinaIds: JSON.stringify(["maquina-1"]) },
      { nombre: "Manual Torno.pdf", contenido: Buffer.from("contenido de prueba"), mimetype: "application/pdf" },
    );

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": contentType },
      payload: body,
    });

    expect(respuesta.statusCode).toBe(201);
    const documento = respuesta.json().documento;
    expect(documento).toMatchObject({
      nombre: "Manual Torno.pdf",
      tipoArchivo: "pdf",
      version: 1,
      vigente: true,
      estadoIndexacion: "pendiente",
    });
    expect(runtime.documentosRepo.documentos.get(documento.id)).toBeDefined();
    expect(runtime.colaFalsa.encolados).toContainEqual({
      tipo: "indexar-documento",
      payload: { documentoId: documento.id },
    });
  });

  it("un formato no soportado responde 400", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, admin);
    const { contentType, body } = await construirMultipart(
      { maquinaIds: JSON.stringify(["maquina-1"]) },
      { nombre: "notas.txt", contenido: Buffer.from("x"), mimetype: "text/plain" },
    );

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": contentType },
      payload: body,
    });

    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json().error).toBe("FORMATO_DOCUMENTO_NO_SOPORTADO");
  });

  it("sin ninguna asociación responde 400", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, admin);
    const { contentType, body } = await construirMultipart(
      {},
      { nombre: "manual.md", contenido: Buffer.from("# Título"), mimetype: "text/markdown" },
    );

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": contentType },
      payload: body,
    });

    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json().error).toBe("DOCUMENTO_SIN_ASOCIACION");
  });

  it("un operador no puede subir documentos", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);
    const { contentType, body } = await construirMultipart(
      { maquinaIds: JSON.stringify(["maquina-1"]) },
      { nombre: "manual.md", contenido: Buffer.from("# Título"), mimetype: "text/markdown" },
    );

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": contentType },
      payload: body,
    });

    expect(respuesta.statusCode).toBe(403);
  });

  it("con documentoAnteriorId crea una nueva versión y marca la anterior no vigente", async () => {
    const { app, runtime } = construirApp();
    const cookie = await iniciarSesionComo(app, admin);

    const primero = await construirMultipart(
      { maquinaIds: JSON.stringify(["maquina-1"]) },
      { nombre: "manual.md", contenido: Buffer.from("# v1"), mimetype: "text/markdown" },
    );
    const creado = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": primero.contentType },
      payload: primero.body,
    });
    const idAnterior = creado.json().documento.id as string;

    const segundo = await construirMultipart(
      { documentoAnteriorId: idAnterior },
      { nombre: "manual.md", contenido: Buffer.from("# v2"), mimetype: "text/markdown" },
    );
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": segundo.contentType },
      payload: segundo.body,
    });

    expect(respuesta.statusCode).toBe(201);
    const nuevo = respuesta.json().documento;
    expect(nuevo.version).toBe(2);
    expect(nuevo.documentoAnteriorId).toBe(idAnterior);
    expect(runtime.documentosRepo.documentos.get(idAnterior)?.vigente).toBe(false);
  });
});

describe("GET /api/documentos", () => {
  it("lista documentos filtrados por máquina, solo para admin", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, admin);
    const upload = await construirMultipart(
      { maquinaIds: JSON.stringify(["maquina-1"]) },
      { nombre: "manual.md", contenido: Buffer.from("# Título"), mimetype: "text/markdown" },
    );
    await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": upload.contentType },
      payload: upload.body,
    });

    const listado = await app.inject({
      method: "GET",
      url: "/api/documentos?maquina=maquina-1",
      headers: { cookie },
    });
    expect(listado.statusCode).toBe(200);
    expect(listado.json().documentos).toHaveLength(1);

    const sinCoincidencia = await app.inject({
      method: "GET",
      url: "/api/documentos?maquina=maquina-2",
      headers: { cookie },
    });
    expect(sinCoincidencia.json().documentos).toHaveLength(0);

    const cookieOperador = await iniciarSesionComo(app, operador);
    const comoOperador = await app.inject({ method: "GET", url: "/api/documentos", headers: { cookie: cookieOperador } });
    expect(comoOperador.statusCode).toBe(403);
  });
});

describe("DELETE /api/documentos/:id", () => {
  it("hace soft delete y un id inexistente responde 404", async () => {
    const { app, runtime } = construirApp();
    const cookie = await iniciarSesionComo(app, admin);
    const upload = await construirMultipart(
      { areaIds: JSON.stringify(["area-1"]) },
      { nombre: "manual.md", contenido: Buffer.from("# Título"), mimetype: "text/markdown" },
    );
    const creado = await app.inject({
      method: "POST",
      url: "/api/documentos",
      headers: { cookie, "content-type": upload.contentType },
      payload: upload.body,
    });
    const id = creado.json().documento.id as string;

    const respuesta = await app.inject({ method: "DELETE", url: `/api/documentos/${id}`, headers: { cookie } });
    expect(respuesta.statusCode).toBe(200);
    expect(runtime.documentosRepo.documentos.get(id)?.vigente).toBe(false);

    const inexistente = await app.inject({
      method: "DELETE",
      url: "/api/documentos/00000000-0000-0000-0000-000000000000",
      headers: { cookie },
    });
    expect(inexistente.statusCode).toBe(404);
  });
});

describe("POST /api/feedback", () => {
  it("cualquier usuario autenticado puede registrar feedback", async () => {
    const { app, runtime } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/feedback",
      headers: { cookie },
      payload: { traceId: "11111111-1111-1111-1111-111111111111", util: true },
    });

    expect(respuesta.statusCode).toBe(201);
    expect(runtime.feedbackRepo.feedbacks).toHaveLength(1);
  });

  it("sin sesión responde 401", async () => {
    const { app } = construirApp();

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/feedback",
      payload: { traceId: "11111111-1111-1111-1111-111111111111", util: false },
    });

    expect(respuesta.statusCode).toBe(401);
  });
});
