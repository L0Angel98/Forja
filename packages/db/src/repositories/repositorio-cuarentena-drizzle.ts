import { count } from "drizzle-orm";
import type { LecturaCuarentena, RepositorioCuarentena } from "@forja/core";
import type { ForjaDb } from "../client";
import { readingQuarantine } from "../schema/reading-quarantine";

export class RepositorioCuarentenaDrizzle implements RepositorioCuarentena {
  constructor(private readonly db: ForjaDb) {}

  async crear(lectura: LecturaCuarentena): Promise<void> {
    await this.db.insert(readingQuarantine).values({
      id: lectura.id,
      sensorExternalId: lectura.sensorExternalId,
      payloadCrudo: lectura.payloadCrudo,
      motivo: lectura.motivo,
      ts: lectura.ts,
      recibidoEn: lectura.recibidoEn,
    });
  }

  async contar(): Promise<number> {
    const [fila] = await this.db.select({ total: count() }).from(readingQuarantine);
    return fila?.total ?? 0;
  }
}
