export interface HerramientaInvocadaTrace {
  readonly nombre: string;
  readonly parametros: unknown;
  readonly exitosa: boolean;
}

/** "rutina/{nombre}" identifica qué rutina disparó el turno (spec 16). */
export type OrigenTurno = "chat" | `rutina/${string}`;

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
