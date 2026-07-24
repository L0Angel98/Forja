import type { ColaTrabajos } from "@forja/core";
import type PgBoss from "pg-boss";

/** Adapter (patrón Adapter) del puerto ColaTrabajos sobre pg-boss. */
export class ColaTrabajosPgBoss implements ColaTrabajos {
  constructor(private readonly boss: PgBoss) {}

  async encolar(tipo: string, payload: Record<string, unknown>): Promise<void> {
    await this.boss.send(tipo, payload);
  }
}
