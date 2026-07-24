export interface EstadisticasVentana {
  readonly min: number | null;
  readonly max: number | null;
  readonly avg: number | null;
  readonly last: number | null;
}

export interface SnapshotSensor extends EstadisticasVentana {
  readonly id: string;
  readonly failureReportId: string;
  readonly sensorId: string;
  readonly ventanaInicio: Date;
  readonly ventanaFin: Date;
}
