export type EstadoSugerenciaMemoria = "pendiente" | "aprobada" | "rechazada";

export interface SugerenciaMemoria {
  readonly id: string;
  readonly contenido: string;
  readonly estado: EstadoSugerenciaMemoria;
  readonly propuestaEn: Date;
}
