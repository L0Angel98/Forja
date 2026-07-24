export interface SensorInfo {
  readonly id: string;
  readonly machineId: string;
  readonly nombre: string;
}

export interface LecturaSensor {
  readonly sensorId: string;
  readonly ts: Date;
  readonly value: number;
}
