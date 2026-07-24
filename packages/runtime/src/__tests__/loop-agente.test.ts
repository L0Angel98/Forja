import type { Herramienta, Usuario } from "@forja/core";
import { crearProveedorLLMFalso, crearRegistradorTraceFalso } from "@forja/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ejecutarTurno } from "../loop-agente";
import { RegistroHerramientas } from "../registro-herramientas";

const usuarioOperador: Usuario = {
  id: "usuario-1",
  email: "operador@planta.mx",
  passwordHash: "hash:x",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

function construirDeps() {
  return {
    registro: new RegistroHerramientas(),
    trace: crearRegistradorTraceFalso(),
  };
}

function parametrosBase(overrides: Partial<Parameters<typeof ejecutarTurno>[1]> = {}) {
  return {
    usuario: usuarioOperador,
    plantId: "planta-1",
    mensaje: "¿cómo va todo?",
    historial: [],
    systemPrompt: "Eres Forja.",
    traceId: "trace-1",
    ...overrides,
  };
}

const herramientaEco: Herramienta<{ texto: string }, string> = {
  nombre: "eco",
  descripcion: "Repite el texto recibido.",
  rolesPermitidos: ["operador", "supervisor", "admin"],
  soloLectura: true,
  schema: z.object({ texto: z.string() }),
  async execute(parametros) {
    return `eco: ${parametros.texto}`;
  },
};

const herramientaSoloSupervisor: Herramienta<Record<string, never>, string> = {
  nombre: "solo_supervisor",
  descripcion: "Acción restringida.",
  rolesPermitidos: ["supervisor", "admin"],
  soloLectura: false,
  schema: z.object({}),
  async execute() {
    return "ok";
  },
};

describe("ejecutarTurno", () => {
  it("si el LLM responde texto directo, no invoca herramientas y registra el trace", async () => {
    const { registro, trace } = construirDeps();
    const llm = crearProveedorLLMFalso([
      { decision: { tipo: "respuesta", texto: "Todo en orden." }, tokensEntrada: 10, tokensSalida: 5, costoUsd: 0.001 },
    ]);

    const resultado = await ejecutarTurno({ registro, llm, trace }, parametrosBase());

    expect(resultado).toEqual({ respuesta: "Todo en orden.", herramientasInvocadas: [], exitoso: true });
    expect(trace.turnos).toHaveLength(1);
    expect(trace.turnos[0]).toMatchObject({
      exitoso: true,
      tokensEntrada: 10,
      tokensSalida: 5,
      costoUsd: 0.001,
      herramientasInvocadas: [],
    });
  });

  it("invoca una herramienta permitida y usa su resultado para la respuesta final", async () => {
    const { registro, trace } = construirDeps();
    registro.registrar(herramientaEco);
    const llm = crearProveedorLLMFalso([
      {
        decision: { tipo: "invocar_herramienta", nombre: "eco", parametros: { texto: "hola" } },
        tokensEntrada: 5,
        tokensSalida: 5,
        costoUsd: 0.0005,
      },
      { decision: { tipo: "respuesta", texto: "Listo, hice eco de tu mensaje." }, tokensEntrada: 8, tokensSalida: 4, costoUsd: 0.0005 },
    ]);

    const resultado = await ejecutarTurno({ registro, llm, trace }, parametrosBase());

    expect(resultado.respuesta).toBe("Listo, hice eco de tu mensaje.");
    expect(resultado.herramientasInvocadas).toEqual([
      { nombre: "eco", parametros: { texto: "hola" }, exitosa: true },
    ]);
    expect(resultado.exitoso).toBe(true);
  });

  it("un operador no puede invocar una herramienta restringida a supervisor/admin (eval de rol)", async () => {
    const { registro, trace } = construirDeps();
    registro.registrar(herramientaSoloSupervisor);
    const llm = crearProveedorLLMFalso([
      { decision: { tipo: "invocar_herramienta", nombre: "solo_supervisor", parametros: {} }, tokensEntrada: 1, tokensSalida: 1, costoUsd: 0 },
      { decision: { tipo: "respuesta", texto: "No puedo hacer eso." }, tokensEntrada: 1, tokensSalida: 1, costoUsd: 0 },
    ]);

    const resultado = await ejecutarTurno({ registro, llm, trace }, parametrosBase());

    expect(resultado.herramientasInvocadas).toEqual([
      { nombre: "solo_supervisor", parametros: {}, exitosa: false },
    ]);
    expect(resultado.respuesta).toBe("No puedo hacer eso.");
  });

  it("parámetros inválidos dan una oportunidad de corrección y luego abortan si vuelve a fallar", async () => {
    const { registro, trace } = construirDeps();
    registro.registrar(herramientaEco);
    const decisionInvalida = {
      decision: { tipo: "invocar_herramienta" as const, nombre: "eco", parametros: { texto: 123 } },
      tokensEntrada: 1,
      tokensSalida: 1,
      costoUsd: 0,
    };
    const llm = crearProveedorLLMFalso([decisionInvalida, decisionInvalida]);

    const resultado = await ejecutarTurno({ registro, llm, trace }, parametrosBase());

    expect(llm.llamadas).toBe(2);
    expect(resultado.herramientasInvocadas).toHaveLength(2);
    expect(resultado.herramientasInvocadas.every((h) => !h.exitosa)).toBe(true);
    expect(resultado.respuesta).toContain("No pude completar");
    expect(resultado.exitoso).toBe(true);
  });

  it("al alcanzar el máximo de 6 invocaciones responde con lo que tenga", async () => {
    const { registro, trace } = construirDeps();
    registro.registrar(herramientaEco);
    const invocarEco = {
      decision: { tipo: "invocar_herramienta" as const, nombre: "eco", parametros: { texto: "x" } },
      tokensEntrada: 1,
      tokensSalida: 1,
      costoUsd: 0,
    };
    const llm = crearProveedorLLMFalso(Array.from({ length: 6 }, () => invocarEco));

    const resultado = await ejecutarTurno({ registro, llm, trace }, parametrosBase());

    expect(resultado.herramientasInvocadas).toHaveLength(6);
    expect(resultado.herramientasInvocadas.every((h) => h.exitosa)).toBe(true);
    expect(resultado.respuesta).toContain("no logré armar una respuesta final");
  });

  it("si el proveedor LLM falla, el turno se degrada sin lanzar y agent_trace lo registra como fallido", async () => {
    const { registro, trace } = construirDeps();
    const llm = { async decidir(): Promise<never> { throw new Error("timeout"); } };

    const resultado = await ejecutarTurno({ registro, llm, trace }, parametrosBase());

    expect(resultado.exitoso).toBe(false);
    expect(resultado.respuesta).toContain("no está disponible");
    expect(trace.turnos).toHaveLength(1);
    expect(trace.turnos[0]?.exitoso).toBe(false);
  });

  it("agent_trace registra el 100% de los turnos (éxito y fallo)", async () => {
    const { registro, trace } = construirDeps();
    const llmExitoso = crearProveedorLLMFalso([
      { decision: { tipo: "respuesta", texto: "ok" }, tokensEntrada: 1, tokensSalida: 1, costoUsd: 0 },
    ]);
    const llmFallido = { async decidir(): Promise<never> { throw new Error("boom"); } };

    await ejecutarTurno({ registro, llm: llmExitoso, trace }, parametrosBase());
    await ejecutarTurno({ registro, llm: llmFallido, trace }, parametrosBase());

    expect(trace.turnos).toHaveLength(2);
    expect(trace.turnos.map((t) => t.exitoso)).toEqual([true, false]);
  });
});
