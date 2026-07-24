export interface SensorMudo {
  readonly sensorId: string;
  readonly nombre: string;
  readonly machineId: string;
  /** null si el sensor nunca ha tenido lecturas. */
  readonly minutosSinLectura: number | null;
}
