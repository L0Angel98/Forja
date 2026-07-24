export interface ParametrosCrearEventoCalendario {
  readonly titulo: string;
  readonly descripcion: string;
  readonly inicio: string;
  readonly fin: string;
  readonly invitados: readonly string[];
}

export interface ParametrosConsultarDisponibilidad {
  readonly desde: string;
  readonly hasta: string;
}

/** Puerto hacia la Google Calendar API real (adaptador en connectors, no en core: es infraestructura externa). */
export interface ClienteGoogleCalendarApi {
  crearEvento(params: ParametrosCrearEventoCalendario): Promise<string>;
  consultarDisponibilidad(params: ParametrosConsultarDisponibilidad): Promise<string>;
}
