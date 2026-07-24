import { and, eq, gte, lte } from "drizzle-orm";
import type { LecturaSensor, RepositorioLecturasVentana } from "@forja/core";
import type { ForjaDb } from "../client";
import { reading } from "../schema/reading";

export class RepositorioLecturasVentanaDrizzle implements RepositorioLecturasVentana {
  constructor(private readonly db: ForjaDb) {}

  async leerVentana(sensorId: string, desde: Date, hasta: Date): Promise<LecturaSensor[]> {
    const filas = await this.db
      .select()
      .from(reading)
      .where(and(eq(reading.sensorId, sensorId), gte(reading.ts, desde), lte(reading.ts, hasta)))
      .orderBy(reading.ts);

    return filas.map((fila) => ({ sensorId: fila.sensorId, ts: fila.ts, value: fila.value }));
  }
}
