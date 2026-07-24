const PATRON_TOPICO = /^forja\/([^/]+)\/([^/]+)$/;

export interface TopicoLectura {
  readonly plantId: string;
  readonly sensorExternalId: string;
}

export function analizarTopico(topico: string): TopicoLectura | null {
  const match = PATRON_TOPICO.exec(topico);
  if (!match) return null;
  return { plantId: match[1]!, sensorExternalId: match[2]! };
}

export interface PayloadLectura {
  readonly ts: Date;
  readonly value: unknown;
}

/** Payload esperado: `{ ts, value }`. JSON inválido o sin ts parseable → null (se trata como no numérico en la clasificación). */
export function analizarPayload(payloadCrudo: string): PayloadLectura | null {
  let datos: unknown;
  try {
    datos = JSON.parse(payloadCrudo);
  } catch {
    return null;
  }
  if (typeof datos !== "object" || datos === null || !("ts" in datos)) return null;

  const { ts, value } = datos as { ts: unknown; value?: unknown };
  const fecha = typeof ts === "string" || typeof ts === "number" ? new Date(ts) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return null;

  return { ts: fecha, value };
}
