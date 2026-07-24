import type { Bucket, SerieAgregada, TipoAgregacion } from "../entities/agregacion-sensor";

export interface ParametrosConsultaAgregada {
  readonly sensorId: string;
  readonly agregacion: TipoAgregacion;
  readonly bucket: Bucket;
  readonly desde: Date;
  readonly hasta: Date;
}

export interface RepositorioAgregacionesSensores {
  consultar(params: ParametrosConsultaAgregada): Promise<SerieAgregada>;
}
