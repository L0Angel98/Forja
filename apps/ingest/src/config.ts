export interface ConfiguracionIngesta {
  readonly mqttPort: number;
  readonly bufferMaximo: number;
  readonly flushIntervaloMs: number;
  readonly flushMaxLecturas: number;
  readonly refrescoCatalogoMs: number;
  readonly backoffInicialMs: number;
  readonly backoffMaximoMs: number;
  /** null = autenticación deshabilitada (uso local/desarrollo). */
  readonly credencialesDispositivos: ReadonlyMap<string, string> | null;
}

const MQTT_PORT_POR_DEFECTO = 1883;
const BUFFER_MAXIMO_POR_DEFECTO = 50_000;
const FLUSH_INTERVALO_MS_POR_DEFECTO = 1_000;
const FLUSH_MAX_LECTURAS_POR_DEFECTO = 500;
const REFRESCO_CATALOGO_MS_POR_DEFECTO = 30_000;
const BACKOFF_INICIAL_MS_POR_DEFECTO = 1_000;
const BACKOFF_MAXIMO_MS_POR_DEFECTO = 30_000;

function entero(valor: string | undefined, porDefecto: number): number {
  if (!valor) return porDefecto;
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

/**
 * Credenciales por dispositivo/gateway: JSON `{ "usuario": "password", ... }`
 * en MQTT_DEVICE_CREDENTIALS. Sin la variable, auth queda deshabilitada
 * (dev/local); en producción se documenta como requerida.
 */
function credenciales(valor: string | undefined): ReadonlyMap<string, string> | null {
  if (!valor) return null;
  const datos: unknown = JSON.parse(valor);
  if (typeof datos !== "object" || datos === null) return null;
  return new Map(Object.entries(datos as Record<string, string>));
}

export function cargarConfiguracion(env: NodeJS.ProcessEnv = process.env): ConfiguracionIngesta {
  return {
    mqttPort: entero(env["MQTT_PORT"], MQTT_PORT_POR_DEFECTO),
    bufferMaximo: entero(env["INGEST_BUFFER_MAXIMO"], BUFFER_MAXIMO_POR_DEFECTO),
    flushIntervaloMs: entero(env["INGEST_FLUSH_INTERVALO_MS"], FLUSH_INTERVALO_MS_POR_DEFECTO),
    flushMaxLecturas: entero(env["INGEST_FLUSH_MAX_LECTURAS"], FLUSH_MAX_LECTURAS_POR_DEFECTO),
    refrescoCatalogoMs: entero(env["INGEST_REFRESCO_CATALOGO_MS"], REFRESCO_CATALOGO_MS_POR_DEFECTO),
    backoffInicialMs: entero(env["INGEST_BACKOFF_INICIAL_MS"], BACKOFF_INICIAL_MS_POR_DEFECTO),
    backoffMaximoMs: entero(env["INGEST_BACKOFF_MAXIMO_MS"], BACKOFF_MAXIMO_MS_POR_DEFECTO),
    credencialesDispositivos: credenciales(env["MQTT_DEVICE_CREDENTIALS"]),
  };
}
