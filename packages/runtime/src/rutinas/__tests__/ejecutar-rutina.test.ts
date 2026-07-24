import type { Herramienta, RutinaProgramada } from "@forja/core";
import {
  crearCanalSalidaEnviadorFalso,
  crearProveedorLLMFalso,
  crearRegistradorTraceFalso,
  crearRepositorioEjecucionesRutinaFalso,
} from "@forja/core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ejecutarRutina } from "../ejecutar-rutina";
import { RegistroCanalesSalida } from "../registro-canales-salida";
import { RegistroHerramientas } from "../../registro-herramientas";

const AHORA = new Date("2026-01-15T06:00:00.000Z");

const herramientaLectura: Herramienta<Record<string, never>, string> = {
  nombre: "consultar_algo",
  descripcion: "Lee algo.",
  rolesPermitidos: ["operador", "supervisor", "admin"],
  soloLectura: true,
  schema: z.object({}),
  async execute() {
    return "dato leído";
  },
};

const herramientaEscritura: Herramienta<Record<string, never>, string> = {
  nombre: "escribir_algo",
  descripcion: "Escribe algo.",
  rolesPermitidos: ["operador", "supervisor", "admin"],
  soloLectura: false,
  schema: z.object({}),
  async execute() {
    return "escrito";
  },
};

function construirRutina(overrides: Partial<RutinaProgramada> = {}): RutinaProgramada {
  return {
    nombre: "resumen-diario",
    cron: "0 6 * * *",
    rol: "supervisor-lectura",
    herramientas: ["consultar_algo"],
    salida: { tipo: "ui" },
    presupuestoTokens: 1000,
    activa: true,
    prompt: "Resume las fallas de las últimas 24 horas.",
    ...overrides,
  };
}

function construirDeps(overrides: Partial<{ presupuestoMensualGlobal: number }> = {}) {
  const registro = new RegistroHerramientas();
  registro.registrar(herramientaLectura);
  registro.registrar(herramientaEscritura);

  const canales = new RegistroCanalesSalida();
  const enviadorUi = crearCanalSalidaEnviadorFalso();
  canales.registrar("ui", enviadorUi);

  return {
    registro,
    trace: crearRegistradorTraceFalso(),
    ejecuciones: crearRepositorioEjecucionesRutinaFalso(),
    canales,
    enviadorUi,
    generarId: (() => {
      let contador = 0;
      return () => `ejecucion-${(contador += 1)}`;
    })(),
    presupuestoMensualGlobal: overrides.presupuestoMensualGlobal ?? 1_000_000,
  };
}

const PARAMS_BASE = { plantId: "planta-1", systemPrompt: "Eres Forja.", ahora: AHORA };

describe("ejecutarRutina", () => {
  it("ejecuta con éxito, persiste el historial y entrega por el canal", async () => {
    const deps = construirDeps();
    const llm = crearProveedorLLMFalso([
      { decision: { tipo: "respuesta", texto: "3 fallas en el área de ensamble." }, tokensEntrada: 100, tokensSalida: 50, costoUsd: 0.01 },
    ]);

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina: construirRutina(), ...PARAMS_BASE });

    expect(ejecucion.estado).toBe("exitosa");
    expect(ejecucion.salida).toBe("3 fallas en el área de ensamble.");
    expect(ejecucion.tokensUsados).toBe(150);
    expect(ejecucion.costoUsd).toBe(0.01);
    expect(ejecucion.error).toBeNull();
    expect(deps.ejecuciones.ejecuciones).toHaveLength(1);
    expect(deps.enviadorUi.envios).toHaveLength(1);
    expect(deps.enviadorUi.envios[0]).toMatchObject({
      rutinaNombre: "resumen-diario",
      resultado: "3 fallas en el área de ensamble.",
    });
  });

  it("registra el trace con origen rutina/{nombre} y usuarioId null", async () => {
    const deps = construirDeps();
    const llm = crearProveedorLLMFalso([
      { decision: { tipo: "respuesta", texto: "ok" }, tokensEntrada: 1, tokensSalida: 1, costoUsd: 0 },
    ]);

    await ejecutarRutina({ ...deps, llm }, { rutina: construirRutina(), ...PARAMS_BASE });

    expect(deps.trace.turnos[0]).toMatchObject({ origen: "rutina/resumen-diario", usuarioId: null });
  });

  it("por construcción, la rutina nunca puede usar una herramienta de escritura aunque esté en su lista", async () => {
    const deps = construirDeps();
    const llm = crearProveedorLLMFalso([
      {
        decision: { tipo: "invocar_herramienta", nombre: "escribir_algo", parametros: {} },
        tokensEntrada: 1,
        tokensSalida: 1,
        costoUsd: 0,
      },
      { decision: { tipo: "respuesta", texto: "no pude escribir" }, tokensEntrada: 1, tokensSalida: 1, costoUsd: 0 },
    ]);
    const rutinaConEscritura = construirRutina({ herramientas: ["escribir_algo"] });

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina: rutinaConEscritura, ...PARAMS_BASE });

    expect(deps.trace.turnos[0]?.herramientasInvocadas).toEqual([
      { nombre: "escribir_algo", parametros: {}, exitosa: false },
    ]);
    expect(ejecucion.estado).toBe("exitosa");
  });

  it("si hay una ejecución en curso de la misma rutina, la omite y no llama al LLM", async () => {
    const deps = construirDeps();
    deps.ejecuciones.ejecuciones.push({
      id: "en-curso",
      rutinaNombre: "resumen-diario",
      plantId: "planta-1",
      iniciadaEn: new Date("2026-01-15T05:59:00.000Z"),
      finalizadaEn: null,
      estado: "exitosa",
      tokensUsados: 0,
      costoUsd: 0,
      salida: null,
      error: null,
    });
    const llm = crearProveedorLLMFalso([]);

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina: construirRutina(), ...PARAMS_BASE });

    expect(ejecucion.estado).toBe("omitida");
    expect(llm.llamadas).toBe(0);
    expect(deps.enviadorUi.envios).toHaveLength(0);
  });

  it("si el presupuesto mensual global ya se alcanzó, pausa la ejecución sin llamar al LLM", async () => {
    const deps = construirDeps({ presupuestoMensualGlobal: 500 });
    deps.ejecuciones.ejecuciones.push({
      id: "previa",
      rutinaNombre: "otra-rutina",
      plantId: "planta-1",
      iniciadaEn: new Date("2026-01-10T00:00:00.000Z"),
      finalizadaEn: new Date("2026-01-10T00:01:00.000Z"),
      estado: "exitosa",
      tokensUsados: 600,
      costoUsd: 0.1,
      salida: "algo",
      error: null,
    });
    const llm = crearProveedorLLMFalso([]);

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina: construirRutina(), ...PARAMS_BASE });

    expect(ejecucion.estado).toBe("pausada");
    expect(llm.llamadas).toBe(0);
  });

  it("marca excedida si el turno abortó por presupuestoTokens", async () => {
    const deps = construirDeps();
    const llm = crearProveedorLLMFalso([
      {
        decision: { tipo: "invocar_herramienta", nombre: "consultar_algo", parametros: {} },
        tokensEntrada: 600,
        tokensSalida: 600,
        costoUsd: 0.1,
      },
      { decision: { tipo: "respuesta", texto: "no debería llegar aquí" }, tokensEntrada: 1, tokensSalida: 1, costoUsd: 0 },
    ]);
    const rutina = construirRutina({ presupuestoTokens: 1000 });

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina, ...PARAMS_BASE });

    expect(ejecucion.estado).toBe("excedida");
    expect(llm.llamadas).toBe(1);
  });

  it("si el canal de salida falla al entregar, la ejecución se marca fallida con el error de entrega", async () => {
    const deps = construirDeps();
    deps.canales.registrar("webhook", {
      async enviar() {
        throw new Error("el servidor remoto respondió 500");
      },
    });
    const llm = crearProveedorLLMFalso([
      { decision: { tipo: "respuesta", texto: "resultado calculado" }, tokensEntrada: 10, tokensSalida: 10, costoUsd: 0 },
    ]);
    const rutina = construirRutina({ salida: { tipo: "webhook", url: "https://ejemplo.com/hook" } });

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina, ...PARAMS_BASE });

    expect(ejecucion.estado).toBe("fallida");
    expect(ejecucion.salida).toBe("resultado calculado");
    expect(ejecucion.error).toContain("500");
  });

  it("no entrega nada por el canal si el turno terminó fallido", async () => {
    const deps = construirDeps();
    const llm = { async decidir(): Promise<never> { throw new Error("boom"); } };

    const ejecucion = await ejecutarRutina({ ...deps, llm }, { rutina: construirRutina(), ...PARAMS_BASE });

    expect(ejecucion.estado).toBe("fallida");
    expect(deps.enviadorUi.envios).toHaveLength(0);
  });

  it("propaga un fallo inesperado antes de ejecutarTurno como ejecución fallida (nunca lanza)", async () => {
    const deps = construirDeps();
    const registroRoto = { disponiblesParaRutina: vi.fn(() => { throw new Error("registry roto"); }) };
    const llm = crearProveedorLLMFalso([]);

    const ejecucion = await ejecutarRutina(
      { ...deps, registro: registroRoto as unknown as RegistroHerramientas, llm },
      { rutina: construirRutina(), ...PARAMS_BASE },
    );

    expect(ejecucion.estado).toBe("fallida");
    expect(ejecucion.error).toContain("registry roto");
  });
});
