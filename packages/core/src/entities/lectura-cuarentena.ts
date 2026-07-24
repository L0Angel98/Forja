export const MOTIVOS_CUARENTENA = ["sensor_desconocido", "payload_no_numerico", "timestamp_futuro"] as const;
export type MotivoCuarentena = (typeof MOTIVOS_CUARENTENA)[number];

export interface LecturaCuarentena {
  readonly id: string;
  readonly sensorExternalId: string;
  readonly payloadCrudo: string;
  readonly motivo: MotivoCuarentena;
  readonly ts: Date | null;
  readonly recibidoEn: Date;
}
