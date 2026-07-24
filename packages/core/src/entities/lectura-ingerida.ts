export interface LecturaIngerida {
  readonly sensorId: string;
  readonly ts: Date;
  readonly value: number;
  readonly fueraDeRango: boolean;
}
