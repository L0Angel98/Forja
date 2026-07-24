import type { Flusher } from "./flusher";

export interface ConfiguracionProgramadorFlush {
  readonly intervaloMs: number;
  readonly backoffInicialMs: number;
  readonly backoffMaximoMs: number;
}

/**
 * Dispara flush() cada `intervaloMs`. Si la DB no responde, reintenta con
 * backoff exponencial (acotado a backoffMaximoMs) en vez de machacarla o
 * de dejar de intentar: los buffers retienen las lecturas mientras tanto.
 */
export function iniciarProgramadorFlush(
  flusher: Flusher,
  config: ConfiguracionProgramadorFlush,
  logger: Pick<Console, "error"> = console,
): () => void {
  let detenido = false;
  let backoffActualMs = config.backoffInicialMs;
  let timer: NodeJS.Timeout | undefined;

  const programar = (ms: number): void => {
    if (detenido) return;
    timer = setTimeout(() => void ejecutar(), ms);
    timer.unref();
  };

  const ejecutar = async (): Promise<void> => {
    try {
      await flusher.flush();
      backoffActualMs = config.backoffInicialMs;
      programar(config.intervaloMs);
    } catch (error) {
      logger.error("ingest: fallo al volcar lecturas a la base de datos, reintentando con backoff", error);
      programar(backoffActualMs);
      backoffActualMs = Math.min(backoffActualMs * 2, config.backoffMaximoMs);
    }
  };

  programar(config.intervaloMs);

  return () => {
    detenido = true;
    if (timer) clearTimeout(timer);
  };
}
