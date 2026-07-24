import type { RutinaProgramada } from "@forja/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramadorRutinas } from "../programador-rutinas";

function construirRutina(overrides: Partial<RutinaProgramada> = {}): RutinaProgramada {
  return {
    nombre: "resumen-diario",
    cron: "*/5 * * * *",
    rol: "supervisor-lectura",
    herramientas: [],
    salida: { tipo: "ui" },
    presupuestoTokens: 1000,
    activa: true,
    prompt: "Resume.",
    ...overrides,
  };
}

describe("ProgramadorRutinas", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ejecuta una rutina activa cuando llega su próxima corrida (cron acelerado)", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina()], errores: [] }),
      ejecutar,
    });

    await programador.iniciar();
    expect(ejecutar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(ejecutar).toHaveBeenCalledTimes(1);
    expect(ejecutar).toHaveBeenCalledWith(expect.objectContaining({ nombre: "resumen-diario" }));

    programador.detener();
  });

  it("se reprograma después de cada disparo (dos ejecuciones en dos intervalos)", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina()], errores: [] }),
      ejecutar,
    });

    await programador.iniciar();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(ejecutar).toHaveBeenCalledTimes(2);
    programador.detener();
  });

  it("una rutina activa: false no se programa", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina({ activa: false })], errores: [] }),
      ejecutar,
    });

    await programador.iniciar();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(ejecutar).not.toHaveBeenCalled();
    expect(programador.obtenerEstado()[0]?.proximaEjecucion).toBeNull();

    programador.detener();
  });

  it("recargar() cambia el schedule sin reiniciar el proceso (editar el cron)", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    let cronActual = "*/5 * * * *";
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina({ cron: cronActual })], errores: [] }),
      ejecutar,
    });

    await programador.iniciar();

    // se edita el .md: ahora dispara cada hora en vez de cada 5 minutos
    cronActual = "0 * * * *";
    await programador.recargar();

    // a los 5 minutos ya no debería disparar (el cron nuevo es cada hora)
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(ejecutar).not.toHaveBeenCalled();

    // completando la hora sí dispara
    await vi.advanceTimersByTimeAsync(55 * 60 * 1000);
    expect(ejecutar).toHaveBeenCalledTimes(1);

    programador.detener();
  });

  it("recargar() desprograma una rutina que se eliminó del directorio", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    let rutinas = [construirRutina()];
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas, errores: [] }),
      ejecutar,
    });

    await programador.iniciar();
    rutinas = [];
    await programador.recargar();

    expect(programador.obtenerEstado()).toEqual([]);

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(ejecutar).not.toHaveBeenCalled();

    programador.detener();
  });

  it("recargar() reactiva una rutina que estaba desactivada", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    let activa = false;
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina({ activa })], errores: [] }),
      ejecutar,
    });

    await programador.iniciar();
    activa = true;
    await programador.recargar();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(ejecutar).toHaveBeenCalledTimes(1);

    programador.detener();
  });

  it("expone los errores de carga sin que tumben el resto de rutinas válidas", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({
        rutinas: [construirRutina()],
        errores: [{ archivo: "rota.md", error: "la herramienta X puede escribir" }],
      }),
      ejecutar,
    });

    await programador.iniciar();

    expect(programador.obtenerErroresCarga()).toEqual([{ archivo: "rota.md", error: "la herramienta X puede escribir" }]);
    expect(programador.obtenerEstado()).toHaveLength(1);

    programador.detener();
  });

  it("un error dentro de ejecutar() se registra pero no detiene la reprogramación", async () => {
    const ejecutar = vi.fn().mockRejectedValue(new Error("boom"));
    const logger = { error: vi.fn() };
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina()], errores: [] }),
      ejecutar,
      logger,
    });

    await programador.iniciar();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(ejecutar).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(2);

    programador.detener();
  });

  it("detener() cancela los temporizadores pendientes", async () => {
    const ejecutar = vi.fn().mockResolvedValue(undefined);
    const programador = new ProgramadorRutinas({
      cargarRutinas: async () => ({ rutinas: [construirRutina()], errores: [] }),
      ejecutar,
    });

    await programador.iniciar();
    programador.detener();

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(ejecutar).not.toHaveBeenCalled();
  });
});
