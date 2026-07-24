import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Herramienta } from "@forja/core";
import {
  crearCanalSalidaEnviadorFalso,
  crearProveedorLLMFalso,
  crearRegistradorTraceFalso,
  crearRepositorioEjecucionesRutinaFalso,
} from "@forja/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { RegistroHerramientas } from "../../registro-herramientas";
import { cargarRutinasDesdeDirectorio } from "../cargar-rutinas-desde-directorio";
import { ejecutarRutina } from "../ejecutar-rutina";
import { ProgramadorRutinas } from "../programador-rutinas";
import { RegistroCanalesSalida } from "../registro-canales-salida";

const herramientaLectura: Herramienta<Record<string, never>, string> = {
  nombre: "consultar_sensores",
  descripcion: "Lee sensores.",
  rolesPermitidos: ["operador", "supervisor", "admin"],
  soloLectura: true,
  schema: z.object({}),
  async execute() {
    return "sin anomalías";
  },
};

const RUTINA_MD = [
  "---",
  "nombre: resumen-diario",
  "cron: \"*/5 * * * *\"",
  "rol: supervisor-lectura",
  "herramientas:",
  "  - consultar_sensores",
  "salida: ui",
  "presupuesto_tokens: 1000",
  "activa: true",
  "---",
  "Resume el estado de la planta.",
].join("\n");

let directorioRutinas: string;

beforeEach(async () => {
  directorioRutinas = await fs.mkdtemp(path.join(os.tmpdir(), "forja-rutinas-aceptacion-"));
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T06:00:00.000Z"));
});

afterEach(async () => {
  vi.useRealTimers();
  await fs.rm(directorioRutinas, { recursive: true, force: true });
});

// Acceptance criterion de spec 16: "Una rutina con cron cada 5 minutos
// ejecuta y entrega salida al canal ui (integración, cron acelerado en
// test)". A diferencia de los tests unitarios de ProgramadorRutinas
// (ejecutar mockeado) y de ejecutarRutina (carga desde archivo mockeada),
// aquí se conecta la pila completa: archivo .md real en disco ->
// cargarRutinasDesdeDirectorio -> ProgramadorRutinas (cron real acelerado
// con fake timers) -> ejecutarRutina -> RegistroCanalesSalida -> canal ui.
describe("aceptación spec 16: rutina de disco a canal ui vía cron acelerado", () => {
  it("una rutina activa con cron */5 * * * * se ejecuta sola y entrega al canal ui", async () => {
    await fs.writeFile(path.join(directorioRutinas, "resumen-diario.md"), RUTINA_MD, "utf8");

    const registro = new RegistroHerramientas();
    registro.registrar(herramientaLectura);

    const canales = new RegistroCanalesSalida();
    const enviadorUi = crearCanalSalidaEnviadorFalso();
    canales.registrar("ui", enviadorUi);

    const llm = crearProveedorLLMFalso([
      { decision: { tipo: "respuesta", texto: "Planta sin anomalías." }, tokensEntrada: 50, tokensSalida: 20, costoUsd: 0.005 },
    ]);
    const ejecuciones = crearRepositorioEjecucionesRutinaFalso();
    const trace = crearRegistradorTraceFalso();

    const programador = new ProgramadorRutinas({
      cargarRutinas: () =>
        cargarRutinasDesdeDirectorio(directorioRutinas, { catalogoHerramientas: registro, presupuestoMaximoGlobal: 1000 }),
      ejecutar: (rutina) =>
        ejecutarRutina(
          { registro, llm, trace, ejecuciones, canales, generarId: () => "ejecucion-1", presupuestoMensualGlobal: 1_000_000 },
          { rutina, plantId: "planta-1", systemPrompt: "Eres Forja.", ahora: new Date() },
        ).then(() => undefined),
    });

    await programador.iniciar();
    expect(enviadorUi.envios).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(enviadorUi.envios).toHaveLength(1);
    expect(enviadorUi.envios[0]).toMatchObject({
      rutinaNombre: "resumen-diario",
      resultado: "Planta sin anomalías.",
    });
    expect(ejecuciones.ejecuciones).toHaveLength(1);
    expect(ejecuciones.ejecuciones[0]).toMatchObject({ estado: "exitosa", rutinaNombre: "resumen-diario" });
    expect(trace.turnos[0]).toMatchObject({ origen: "rutina/resumen-diario" });

    programador.detener();
  });
});
