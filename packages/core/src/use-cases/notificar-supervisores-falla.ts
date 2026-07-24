import type { Notificacion } from "../entities/notificacion";
import type { RepositorioNotificaciones } from "../ports/repositorio-notificaciones";

export const TIPO_NOTIFICACION_FALLA_REPORTADA = "falla_reportada";

export interface DependenciasNotificarSupervisoresFalla {
  notificaciones: RepositorioNotificaciones;
  generarId: () => string;
}

export interface ParametrosNotificarSupervisoresFalla {
  areaId: string;
  failureReportId: string;
  ahora: Date;
}

export async function notificarSupervisoresFalla(
  deps: DependenciasNotificarSupervisoresFalla,
  params: ParametrosNotificarSupervisoresFalla,
): Promise<Notificacion> {
  const notificacion: Notificacion = {
    id: deps.generarId(),
    areaId: params.areaId,
    tipo: TIPO_NOTIFICACION_FALLA_REPORTADA,
    referenciaId: params.failureReportId,
    creadaEn: params.ahora,
  };

  await deps.notificaciones.crear(notificacion);

  return notificacion;
}
