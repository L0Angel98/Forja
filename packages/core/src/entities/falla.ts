export const SEVERIDADES = [1, 2, 3, 4] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const SINTOMAS_TAXONOMIA = [
  "ruido_anormal",
  "vibracion_excesiva",
  "fuga",
  "sobrecalentamiento",
  "no_enciende",
  "paro_total",
  "error_sensor",
] as const;
export type SintomaTaxonomia = (typeof SINTOMAS_TAXONOMIA)[number];

export const ESTADOS_FALLA = ["abierto", "en_revision", "atendido", "cerrado"] as const;
export type EstadoFalla = (typeof ESTADOS_FALLA)[number];

export type OrigenReporte = "agente" | "formulario";

export interface ReporteFalla {
  readonly id: string;
  readonly machineId: string;
  readonly reportadoPor: string;
  readonly sintomaTaxonomia: SintomaTaxonomia | null;
  readonly sintomaOtro: string | null;
  readonly descripcion: string;
  readonly severidad: Severidad;
  readonly fotos: readonly string[];
  readonly origen: OrigenReporte;
  readonly estado: EstadoFalla;
  readonly creadoEn: Date;
}
