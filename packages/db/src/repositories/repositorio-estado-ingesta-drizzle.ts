import { eq } from "drizzle-orm";
import type { EstadoIngesta, RepositorioEstadoIngesta } from "@forja/core";
import type { ForjaDb } from "../client";
import { INGEST_STATUS_ID, ingestStatus } from "../schema/ingest-status";

export class RepositorioEstadoIngestaDrizzle implements RepositorioEstadoIngesta {
  constructor(private readonly db: ForjaDb) {}

  async actualizar(estado: EstadoIngesta): Promise<void> {
    await this.db
      .insert(ingestStatus)
      .values({
        id: INGEST_STATUS_ID,
        lagMs: estado.lagMs,
        bufferSize: estado.bufferSize,
        actualizadoEn: estado.actualizadoEn,
      })
      .onConflictDoUpdate({
        target: ingestStatus.id,
        set: { lagMs: estado.lagMs, bufferSize: estado.bufferSize, actualizadoEn: estado.actualizadoEn },
      });
  }

  async obtener(): Promise<EstadoIngesta | null> {
    const [fila] = await this.db
      .select()
      .from(ingestStatus)
      .where(eq(ingestStatus.id, INGEST_STATUS_ID))
      .limit(1);
    return fila ? { lagMs: fila.lagMs, bufferSize: fila.bufferSize, actualizadoEn: fila.actualizadoEn } : null;
  }
}
