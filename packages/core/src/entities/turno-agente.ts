export interface HerramientaInvocadaTrace {
  readonly nombre: string;
  readonly parametros: unknown;
  readonly exitosa: boolean;
}

/**
 * "rutina/{nombre}" identifica qué rutina disparó el turno (spec 16).
 * "conector-confirmacion/{conector}" es el turno sintético que registra
 * confirmarAccionConector (spec 17): no hay un turno de chat real detrás
 * de un click de confirmación, pero la auditoría de invocaciones de
 * conector debe seguir viviendo en agent_trace igual que cualquier otra.
 */
export type OrigenTurno = "chat" | `rutina/${string}` | `conector-confirmacion/${string}`;

export interface TurnoAgente {
  readonly plantId: string;
  readonly usuarioId: string | null;
  readonly origen: OrigenTurno;
  readonly herramientasInvocadas: readonly HerramientaInvocadaTrace[];
  readonly tokensEntrada: number;
  readonly tokensSalida: number;
  readonly costoUsd: number;
  readonly latenciaMs: number;
  readonly exitoso: boolean;
}
