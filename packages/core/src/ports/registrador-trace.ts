import type { TurnoAgente } from "../entities/turno-agente";

export interface RegistradorTrace {
  registrarTurno(turno: TurnoAgente): Promise<void>;
}
