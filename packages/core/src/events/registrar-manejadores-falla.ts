import type { RepositorioNotificaciones } from "../ports/repositorio-notificaciones";
import type { ColaTrabajos } from "../ports/cola-trabajos";
import { notificarSupervisoresFalla } from "../use-cases/notificar-supervisores-falla";
import type { BusEventos } from "./bus-eventos";
import { EVENTO_FALLA_REPORTADA, type FallaReportada } from "./falla-reportada";

export const TRABAJO_MATERIALIZAR_SNAPSHOT = "materializar-snapshot";

export interface DependenciasManejadoresFalla {
  cola: ColaTrabajos;
  notificaciones: RepositorioNotificaciones;
  generarId: () => string;
}

/**
 * Suscribe al bus los dos manejadores del evento FallaReportada: encolar el
 * job de materialización de snapshot (pg-boss, con reintentos) y notificar a
 * los supervisores del área. Ambos corren de forma independiente: si uno
 * falla no debe impedir al otro.
 */
export function registrarManejadoresFalla(bus: BusEventos, deps: DependenciasManejadoresFalla): void {
  bus.suscribir<FallaReportada>(EVENTO_FALLA_REPORTADA, async (evento) => {
    await deps.cola.encolar(TRABAJO_MATERIALIZAR_SNAPSHOT, {
      failureReportId: evento.failureReportId,
      machineId: evento.machineId,
      ocurridoEn: evento.ocurridoEn.toISOString(),
    });
  });

  bus.suscribir<FallaReportada>(EVENTO_FALLA_REPORTADA, async (evento) => {
    await notificarSupervisoresFalla(
      { notificaciones: deps.notificaciones, generarId: deps.generarId },
      { areaId: evento.areaId, failureReportId: evento.failureReportId, ahora: evento.ocurridoEn },
    );
  });
}
