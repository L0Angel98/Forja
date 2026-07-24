import type { LecturaIngerida } from "./entities/lectura-ingerida";
import type { MotivoCuarentena } from "./entities/lectura-cuarentena";
import type { SensorCatalogo } from "./entities/sensor-catalogo";

const VENTANA_FUTURO_MS = 24 * 60 * 60 * 1000;

export type ResultadoClasificarLectura =
  | { readonly tipo: "aceptada"; readonly lectura: LecturaIngerida }
  | { readonly tipo: "cuarentena"; readonly motivo: MotivoCuarentena };

export interface ParametrosClasificarLectura {
  /** Ya resuelto por el llamador desde el catálogo en caché (spec 15: nunca una consulta a DB por lectura). */
  readonly sensor: SensorCatalogo | null;
  readonly ts: Date;
  readonly valorCrudo: unknown;
  readonly ahora: Date;
}

/**
 * Clasifica una lectura MQTT cruda antes de insertarla: sensor desconocido,
 * payload no numérico o timestamp más de 24h en el futuro van a cuarentena
 * (nunca se descartan en silencio). Un valor numérico fuera del rango
 * físico declarado del sensor SÍ se acepta, marcado con fueraDeRango.
 */
export function clasificarLectura(params: ParametrosClasificarLectura): ResultadoClasificarLectura {
  if (!params.sensor) {
    return { tipo: "cuarentena", motivo: "sensor_desconocido" };
  }

  const valor = typeof params.valorCrudo === "number" ? params.valorCrudo : Number(params.valorCrudo);
  const esNumerico =
    (typeof params.valorCrudo === "number" || typeof params.valorCrudo === "string") &&
    params.valorCrudo !== "" &&
    Number.isFinite(valor);

  if (!esNumerico) {
    return { tipo: "cuarentena", motivo: "payload_no_numerico" };
  }

  const limiteFuturoMs = params.ahora.getTime() + VENTANA_FUTURO_MS;
  if (params.ts.getTime() > limiteFuturoMs) {
    return { tipo: "cuarentena", motivo: "timestamp_futuro" };
  }

  const fueraDeRango = valor < params.sensor.rangoMin || valor > params.sensor.rangoMax;

  return {
    tipo: "aceptada",
    lectura: { sensorId: params.sensor.id, ts: params.ts, value: valor, fueraDeRango },
  };
}
