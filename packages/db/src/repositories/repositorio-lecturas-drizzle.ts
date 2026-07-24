import { desc, eq } from "drizzle-orm";
import type { RepositorioLecturas } from "@forja/core";
import type { ForjaDb } from "../client";
import { reading } from "../schema/reading";

export class RepositorioLecturasDrizzle implements RepositorioLecturas {
  constructor(private readonly db: ForjaDb) {}

  async insertarLote(lecturas: Parameters<RepositorioLecturas["insertarLote"]>[0]): Promise<void> {
    if (lecturas.length === 0) return;
    await this.db
      .insert(reading)
      .values(
        lecturas.map((lectura) => ({
          sensorId: lectura.sensorId,
          ts: lectura.ts,
          value: lectura.value,
          fueraDeRango: lectura.fueraDeRango,
        })),
      )
      .onConflictDoNothing();
  }

  async ultimaLecturaEn(sensorId: string): Promise<Date | null> {
    const [fila] = await this.db
      .select({ ts: reading.ts })
      .from(reading)
      .where(eq(reading.sensorId, sensorId))
      .orderBy(desc(reading.ts))
      .limit(1);
    return fila?.ts ?? null;
  }
}
