import type { CanalSalida } from "../entities/rutina";

export interface ParametrosEnvioCanal {
  readonly canal: CanalSalida;
  readonly rutinaNombre: string;
  readonly ejecucionId: string;
  readonly resultado: string;
}

/** Strategy: una implementación por tipo de canal (correo/webhook/ui). */
export interface CanalSalidaEnviador {
  enviar(params: ParametrosEnvioCanal): Promise<void>;
}
