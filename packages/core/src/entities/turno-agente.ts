export interface HerramientaInvocadaTrace {
  readonly nombre: string;
  readonly parametros: unknown;
  readonly exitosa: boolean;
}

export type OrigenTurno = "chat" | "rutina";

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
