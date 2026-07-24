export const ESTADOS_EJECUCION_RUTINA = ["exitosa", "fallida", "excedida", "omitida"] as const;
export type EstadoEjecucionRutina = (typeof ESTADOS_EJECUCION_RUTINA)[number];

/** Historial de una corrida de rutina. "omitida" = no corrió porque la anterior seguía en curso. */
export interface EjecucionRutina {
  readonly id: string;
  readonly rutinaNombre: string;
  readonly plantId: string;
  readonly iniciadaEn: Date;
  readonly finalizadaEn: Date | null;
  readonly estado: EstadoEjecucionRutina;
  readonly tokensUsados: number;
  readonly costoUsd: number;
  readonly salida: string | null;
  readonly error: string | null;
}
