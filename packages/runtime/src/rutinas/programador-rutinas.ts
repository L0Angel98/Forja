import { CronExpressionParser } from "cron-parser";
import type { RutinaProgramada } from "@forja/core";
import type { ErrorCargaRutina } from "./cargar-rutinas-desde-directorio";

export interface EstadoRutinaProgramada {
  readonly rutina: RutinaProgramada;
  readonly proximaEjecucion: Date | null;
}

export interface ResultadoCargaParaProgramador {
  readonly rutinas: readonly RutinaProgramada[];
  readonly errores: readonly ErrorCargaRutina[];
}

export interface OpcionesProgramadorRutinas {
  cargarRutinas: () => Promise<ResultadoCargaParaProgramador>;
  ejecutar: (rutina: RutinaProgramada) => Promise<void>;
  logger?: Pick<Console, "error">;
}

function calcularProximaEjecucion(cron: string): Date {
  return CronExpressionParser.parse(cron, { currentDate: new Date() }).next().toDate();
}

/**
 * Scheduler propio en vez de pg-boss.schedule(): necesitamos granularidad
 * de setTimeout (no el polling de ~1 min de pg-boss) para poder acelerar el
 * cron en tests con fake timers, y recalcular next() en cada disparo evita
 * drift. `recargar()` es lo que permite editar el .md y cambiar el
 * schedule sin reiniciar el proceso (se llama desde el onRecargar del
 * WorkspaceLoader, que ya observa workspace/rutinas/*.md).
 */
export class ProgramadorRutinas {
  private readonly temporizadores = new Map<string, NodeJS.Timeout>();
  private readonly rutinas = new Map<string, RutinaProgramada>();
  private erroresCarga: readonly ErrorCargaRutina[] = [];
  private detenido = false;

  constructor(private readonly opciones: OpcionesProgramadorRutinas) {}

  async iniciar(): Promise<void> {
    await this.recargar();
  }

  async recargar(): Promise<void> {
    if (this.detenido) return;
    const { rutinas, errores } = await this.opciones.cargarRutinas();
    this.erroresCarga = errores;

    const nombresCargados = new Set(rutinas.map((r) => r.nombre));
    for (const nombreProgramado of [...this.rutinas.keys()]) {
      if (!nombresCargados.has(nombreProgramado)) {
        this.rutinas.delete(nombreProgramado);
        this.desprogramar(nombreProgramado);
      }
    }

    for (const rutina of rutinas) {
      this.rutinas.set(rutina.nombre, rutina);
      if (rutina.activa) {
        this.reprogramar(rutina);
      } else {
        this.desprogramar(rutina.nombre);
      }
    }
  }

  detener(): void {
    this.detenido = true;
    for (const nombre of [...this.temporizadores.keys()]) this.desprogramar(nombre);
  }

  obtenerErroresCarga(): readonly ErrorCargaRutina[] {
    return this.erroresCarga;
  }

  obtenerEstado(): readonly EstadoRutinaProgramada[] {
    return [...this.rutinas.values()].map((rutina) => ({
      rutina,
      proximaEjecucion: this.temporizadores.has(rutina.nombre) ? calcularProximaEjecucion(rutina.cron) : null,
    }));
  }

  private desprogramar(nombre: string): void {
    const temporizador = this.temporizadores.get(nombre);
    if (temporizador) clearTimeout(temporizador);
    this.temporizadores.delete(nombre);
  }

  private reprogramar(rutina: RutinaProgramada): void {
    this.desprogramar(rutina.nombre);
    const esperaMs = Math.max(0, calcularProximaEjecucion(rutina.cron).getTime() - Date.now());

    const temporizador = setTimeout(() => {
      void this.dispararYReprogramar(rutina.nombre);
    }, esperaMs);
    temporizador.unref();
    this.temporizadores.set(rutina.nombre, temporizador);
  }

  private async dispararYReprogramar(nombre: string): Promise<void> {
    if (this.detenido) return;
    const rutina = this.rutinas.get(nombre);
    if (!rutina) return;

    try {
      await this.opciones.ejecutar(rutina);
    } catch (error) {
      this.opciones.logger?.error(`rutinas: fallo al ejecutar "${nombre}"`, error);
    }

    const rutinaVigente = this.rutinas.get(nombre);
    if (!this.detenido && rutinaVigente?.activa) {
      this.reprogramar(rutinaVigente);
    }
  }
}
