import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConectorConfigurado } from "@forja/core";
import { afterEach, describe, expect, it } from "vitest";
import { CONSTRUCTORES_CONECTORES_INTEGRADOS, crearConectores, type ResultadoFactoryConectores } from "../factory-conectores";
import { NOMBRE_CONECTOR_WEBHOOK } from "../webhook/servidor-webhook";

function configuracion(overrides: Partial<ConectorConfigurado> = {}): ConectorConfigurado {
  return {
    nombre: NOMBRE_CONECTOR_WEBHOOK,
    activo: true,
    permisos: { llamar_webhook: ["admin"] },
    credenciales: {},
    listaBlancaUrls: ["https://ejemplo.com/hook"],
    ...overrides,
  };
}

function servidorConHerramienta(nombreServidor: string, nombreHerramienta: string, soloLectura = true): McpServer {
  const servidor = new McpServer({ name: nombreServidor, version: "1.0.0" });
  servidor.registerTool(
    nombreHerramienta,
    { description: "de prueba", inputSchema: {}, annotations: { readOnlyHint: soloLectura } },
    async () => ({ content: [{ type: "text", text: "ok" }] }),
  );
  return servidor;
}

let resultadoActivo: ResultadoFactoryConectores | undefined;

afterEach(async () => {
  await resultadoActivo?.cerrarTodos();
  resultadoActivo = undefined;
});

describe("crearConectores", () => {
  it("carga el conector webhook (integrado) sin credenciales y expone su herramienta", async () => {
    const resultado = await crearConectores([configuracion()]);
    resultadoActivo = resultado;

    expect(resultado.estados).toEqual([{ nombre: NOMBRE_CONECTOR_WEBHOOK, estado: "disponible", error: null }]);
    expect(resultado.herramientas).toHaveLength(1);
    expect(resultado.herramientas[0]).toMatchObject({ nombre: "llamar_webhook", rolesPermitidos: ["admin"], soloLectura: true });
  });

  it("ignora los conectores inactivos", async () => {
    const resultado = await crearConectores([configuracion({ activo: false })]);
    resultadoActivo = resultado;

    expect(resultado.estados).toEqual([]);
    expect(resultado.herramientas).toEqual([]);
  });

  it("un conector desconocido se marca no_disponible sin afectar a los demás", async () => {
    const constructores = {
      ...CONSTRUCTORES_CONECTORES_INTEGRADOS,
      x: () => servidorConHerramienta("x", "algo"),
    };
    const resultado = await crearConectores(
      [
        configuracion({ nombre: "no-existe", permisos: {} }),
        configuracion({ nombre: "x", permisos: { algo: ["operador"] } }),
      ],
      constructores,
    );
    resultadoActivo = resultado;

    const estadoDesconocido = resultado.estados.find((e) => e.nombre === "no-existe");
    expect(estadoDesconocido?.estado).toBe("no_disponible");
    expect(estadoDesconocido?.error).toContain("no-existe");

    const estadoX = resultado.estados.find((e) => e.nombre === "x");
    expect(estadoX).toEqual({ nombre: "x", estado: "disponible", error: null });
    expect(resultado.herramientas.map((h) => h.nombre)).toEqual(["algo"]);
  });

  it("un conector que falla al construirse (servidor MCP roto) se marca no_disponible con el error visible", async () => {
    // Cubre el mismo camino de resiliencia que un manifiesto inválido real: el conector
    // cae al cargar (construcción del servidor, conexión o listTools) y no tumba al resto.
    const constructoresQueLanzan = {
      roto: () => {
        throw new Error("manifiesto mal formado");
      },
    };

    const resultado = await crearConectores([configuracion({ nombre: "roto", permisos: {} })], constructoresQueLanzan);
    resultadoActivo = resultado;

    expect(resultado.estados).toEqual([{ nombre: "roto", estado: "no_disponible", error: "manifiesto mal formado" }]);
    expect(resultado.herramientas).toEqual([]);
  });

  it("rechaza (marca no_disponible) un nombre de herramienta duplicado entre dos conectores", async () => {
    const constructores = {
      uno: () => servidorConHerramienta("uno", "compartida"),
      dos: () => servidorConHerramienta("dos", "compartida"),
    };

    const resultado = await crearConectores(
      [
        configuracion({ nombre: "uno", permisos: { compartida: ["admin"] } }),
        configuracion({ nombre: "dos", permisos: { compartida: ["admin"] } }),
      ],
      constructores,
    );
    resultadoActivo = resultado;

    expect(resultado.herramientas).toHaveLength(1);
    const estadoUno = resultado.estados.find((e) => e.nombre === "uno");
    const estadoDos = resultado.estados.find((e) => e.nombre === "dos");
    expect([estadoUno?.estado, estadoDos?.estado].sort()).toEqual(["disponible", "no_disponible"]);
  });

  it("no expone una herramienta del manifiesto que no tiene permisos configurados", async () => {
    const constructores = { x: () => servidorConHerramienta("x", "sin_permisos") };

    const resultado = await crearConectores([configuracion({ nombre: "x", permisos: {} })], constructores);
    resultadoActivo = resultado;

    expect(resultado.herramientas).toEqual([]);
    expect(resultado.estados).toEqual([{ nombre: "x", estado: "disponible", error: null }]);
  });

  it("registro.obtener() expone el manifiesto/permisos/cliente para confirmarAccionConector", async () => {
    const resultado = await crearConectores([configuracion()]);
    resultadoActivo = resultado;

    const activo = resultado.registro.obtener(NOMBRE_CONECTOR_WEBHOOK);

    expect(activo?.permisos).toEqual({ llamar_webhook: ["admin"] });
    expect(activo?.manifiesto.herramientas.map((h) => h.nombre)).toEqual(["llamar_webhook"]);
    await expect(activo?.cliente.invocar("llamar_webhook", { url: "https://otra.com" })).rejects.toThrow();
  });

  it("registro.obtener() de un conector no cargado devuelve undefined", async () => {
    const resultado = await crearConectores([]);
    resultadoActivo = resultado;

    expect(resultado.registro.obtener("no-existe")).toBeUndefined();
  });

  it("una herramienta de escritura del conector nunca invoca de verdad al construirse (solo al confirmar)", async () => {
    const resultado = await crearConectores([configuracion()]);
    resultadoActivo = resultado;

    const herramienta = resultado.herramientas[0]!;
    const borrador = await herramienta.execute({ url: "https://ejemplo.com/hook", payload: {} }, {
      usuario: { id: "u1", email: "a@b.com", passwordHash: "x", nombre: "A", rol: "admin", activo: true },
      plantId: "p1",
      traceId: "t1",
    });

    expect(borrador).toEqual({
      conector: NOMBRE_CONECTOR_WEBHOOK,
      herramienta: "llamar_webhook",
      parametros: { url: "https://ejemplo.com/hook", payload: {} },
    });
  });
});
