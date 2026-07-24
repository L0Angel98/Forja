import { crearProveedorLLMFalso, type Usuario } from "@forja/core";
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

function construirApp() {
  const auth = crearComposicionAuthFalsa([operador, supervisor]);
  const runtime = crearComposicionRuntimeFalsa();
  runtime.maquinasRepo.maquinas.set("maquina-prensa", { id: "maquina-prensa", areaId: "area-ensamble", nombre: "Prensa" });
  runtime.maquinasRepo.maquinas.set("maquina-torno", { id: "maquina-torno", areaId: "area-maquinado", nombre: "Torno CNC" });
  runtime.areasUsuarioRepo.asignaciones[operador.id] = ["area-ensamble"];
  const app = buildApp({ auth, runtime });
  return { app, auth, runtime };
}

describe("POST /api/fallas", () => {
  it("un operador reporta una falla en su propia área", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie },
      payload: {
        machineId: "maquina-prensa",
        sintomaTaxonomia: "vibracion_excesiva",
        descripcion: "vibra más de lo normal",
        severidad: 2,
        fotos: [],
      },
    });

    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.json().reporte).toMatchObject({
      machineId: "maquina-prensa",
      estado: "abierto",
      origen: "formulario",
    });
  });

  it("un operador no puede reportar sobre una máquina fuera de su área", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie },
      payload: {
        machineId: "maquina-torno",
        sintomaTaxonomia: "no_enciende",
        descripcion: "no prende",
        severidad: 3,
        fotos: [],
      },
    });

    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json().error).toBe("MAQUINA_FUERA_DE_AREA");
  });

  it("sin síntoma responde 400", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie },
      payload: { machineId: "maquina-prensa", descripcion: "algo pasó", severidad: 1, fotos: [] },
    });

    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json().error).toBe("SINTOMA_REQUERIDO");
  });

  it("sin sesión responde 401", async () => {
    const { app } = construirApp();

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/fallas",
      payload: { machineId: "maquina-prensa", sintomaTaxonomia: "fuga", descripcion: "x", severidad: 1, fotos: [] },
    });

    expect(respuesta.statusCode).toBe(401);
  });
});

describe("GET /api/fallas", () => {
  it("un operador solo ve reportes de su propia área; un supervisor ve todos", async () => {
    const { app } = construirApp();
    const cookieOperador = await iniciarSesionComo(app, operador);

    await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie: cookieOperador },
      payload: {
        machineId: "maquina-prensa",
        sintomaTaxonomia: "fuga",
        descripcion: "fuga de aceite",
        severidad: 1,
        fotos: [],
      },
    });

    const cookieSupervisor = await iniciarSesionComo(app, supervisor);
    await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie: cookieSupervisor },
      payload: {
        machineId: "maquina-torno",
        sintomaTaxonomia: "no_enciende",
        descripcion: "no prende",
        severidad: 3,
        fotos: [],
      },
    });

    const listaOperador = await app.inject({ method: "GET", url: "/api/fallas", headers: { cookie: cookieOperador } });
    expect(listaOperador.statusCode).toBe(200);
    expect(listaOperador.json().fallas).toHaveLength(1);
    expect(listaOperador.json().fallas[0].machineId).toBe("maquina-prensa");

    const listaSupervisor = await app.inject({
      method: "GET",
      url: "/api/fallas",
      headers: { cookie: cookieSupervisor },
    });
    expect(listaSupervisor.statusCode).toBe(200);
    expect(listaSupervisor.json().fallas).toHaveLength(2);
  });
});

describe("PATCH /api/fallas/:id/estado", () => {
  it("un supervisor puede cambiar el estado", async () => {
    const { app } = construirApp();
    const cookieOperador = await iniciarSesionComo(app, operador);
    const creado = await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie: cookieOperador },
      payload: {
        machineId: "maquina-prensa",
        sintomaTaxonomia: "fuga",
        descripcion: "fuga de aceite",
        severidad: 1,
        fotos: [],
      },
    });
    const id = creado.json().reporte.id as string;

    const cookieSupervisor = await iniciarSesionComo(app, supervisor);
    const respuesta = await app.inject({
      method: "PATCH",
      url: `/api/fallas/${id}/estado`,
      headers: { cookie: cookieSupervisor },
      payload: { estado: "en_revision" },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().reporte.estado).toBe("en_revision");
  });

  it("un operador no puede cambiar el estado", async () => {
    const { app } = construirApp();
    const cookieOperador = await iniciarSesionComo(app, operador);
    const creado = await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie: cookieOperador },
      payload: {
        machineId: "maquina-prensa",
        sintomaTaxonomia: "fuga",
        descripcion: "fuga de aceite",
        severidad: 1,
        fotos: [],
      },
    });
    const id = creado.json().reporte.id as string;

    const respuesta = await app.inject({
      method: "PATCH",
      url: `/api/fallas/${id}/estado`,
      headers: { cookie: cookieOperador },
      payload: { estado: "en_revision" },
    });

    expect(respuesta.statusCode).toBe(403);
  });

  it("una transición inválida responde 409", async () => {
    const { app } = construirApp();
    const cookieOperador = await iniciarSesionComo(app, operador);
    const creado = await app.inject({
      method: "POST",
      url: "/api/fallas",
      headers: { cookie: cookieOperador },
      payload: {
        machineId: "maquina-prensa",
        sintomaTaxonomia: "fuga",
        descripcion: "fuga de aceite",
        severidad: 1,
        fotos: [],
      },
    });
    const id = creado.json().reporte.id as string;

    const cookieSupervisor = await iniciarSesionComo(app, supervisor);
    const respuesta = await app.inject({
      method: "PATCH",
      url: `/api/fallas/${id}/estado`,
      headers: { cookie: cookieSupervisor },
      payload: { estado: "atendido" },
    });

    expect(respuesta.statusCode).toBe(409);
  });

  it("un id inexistente responde 404", async () => {
    const { app } = construirApp();
    const cookieSupervisor = await iniciarSesionComo(app, supervisor);

    const respuesta = await app.inject({
      method: "PATCH",
      url: "/api/fallas/00000000-0000-0000-0000-000000000000/estado",
      headers: { cookie: cookieSupervisor },
      payload: { estado: "en_revision" },
    });

    expect(respuesta.statusCode).toBe(404);
  });
});

describe("POST /api/chat", () => {
  it("sin sesión responde 401", async () => {
    const { app } = construirApp();

    const respuesta = await app.inject({ method: "POST", url: "/api/chat", payload: { mensaje: "hola" } });

    expect(respuesta.statusCode).toBe(401);
  });

  it("sin un proveedor LLM configurado, degrada con exitoso=false en vez de fallar", async () => {
    const { app } = construirApp();
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/chat",
      headers: { cookie },
      payload: { mensaje: "la prensa vibra mucho" },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().exitoso).toBe(false);
    expect(typeof respuesta.json().respuesta).toBe("string");
  });

  it("invoca crear_reporte_falla a través del loop del agente y arma un borrador", async () => {
    const { app, runtime } = construirApp();
    runtime.llm = crearProveedorLLMFalso([
      {
        decision: {
          tipo: "invocar_herramienta",
          nombre: "crear_reporte_falla",
          parametros: {
            machineId: "maquina-prensa",
            sintomaTaxonomia: "vibracion_excesiva",
            descripcion: "vibra más de lo normal",
            severidad: 2,
            fotos: [],
          },
        },
        tokensEntrada: 10,
        tokensSalida: 5,
        costoUsd: 0,
      },
      {
        decision: { tipo: "respuesta", texto: "Armé un borrador del reporte, confírmalo para enviarlo." },
        tokensEntrada: 10,
        tokensSalida: 5,
        costoUsd: 0,
      },
    ]);
    const cookie = await iniciarSesionComo(app, operador);

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/chat",
      headers: { cookie },
      payload: { mensaje: "la prensa vibra mucho" },
    });

    expect(respuesta.statusCode).toBe(200);
    const cuerpo = respuesta.json();
    expect(cuerpo.exitoso).toBe(true);
    expect(cuerpo.herramientasInvocadas).toHaveLength(1);
    expect(cuerpo.herramientasInvocadas[0]).toMatchObject({ nombre: "crear_reporte_falla", exitosa: true });
    expect(runtime.fallasRepo.fallas.size).toBe(0);
  });
});
