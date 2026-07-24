export interface SensorCatalogo {
  readonly id: string;
  readonly externalId: string;
  readonly machineId: string;
  readonly nombre: string;
  readonly unidad: string;
  readonly rangoMin: number;
  readonly rangoMax: number;
  readonly mudoTrasMinutos: number;
}
