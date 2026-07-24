import type { RegistradorTrace, TurnoAgente } from "@forja/core";
import type { ForjaDb } from "../client";
import { agentTrace } from "../schema/agent-trace";

export class RegistradorTraceDrizzle implements RegistradorTrace {
  constructor(private readonly db: ForjaDb) {}

  async registrarTurno(turno: TurnoAgente): Promise<void> {
    await this.db.insert(agentTrace).values({
      plantId: turno.plantId,
      userId: turno.usuarioId,
      origen: turno.origen,
      herramientasInvocadas: turno.herramientasInvocadas,
      tokensEntrada: turno.tokensEntrada,
      tokensSalida: turno.tokensSalida,
      costoUsd: turno.costoUsd,
      latenciaMs: turno.latenciaMs,
      exitoso: turno.exitoso,
    });
  }
}
