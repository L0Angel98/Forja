export const TIPOS_AGREGACION = ["min", "max", "avg", "count", "last"] as const;
export type TipoAgregacion = (typeof TIPOS_AGREGACION)[number];

export const BUCKETS = ["5m", "1h", "1d"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const RANGO_MAXIMO_DIAS = 90;
export const MAXIMO_PUNTOS_SERIE = 500;

export interface PuntoSerieAgregada {
  readonly bucket: Date;
  readonly valor: number | null;
}

export interface SerieAgregada {
  readonly sensorId: string;
  readonly agregacion: TipoAgregacion;
  readonly bucket: Bucket;
  readonly puntos: readonly PuntoSerieAgregada[];
  /** true si el bucket pedido producía más de MAXIMO_PUNTOS_SERIE puntos y se usó uno más grueso. */
  readonly reBucketizado: boolean;
}
