import { desc, eq, sql } from "drizzle-orm";
import type { RepositorioLecturas } from "@forja/core";
import type { ForjaDb } from "../client";
import { reading } from "../schema/reading";

/**
 * Continuous aggregates creados WITH NO DATA (migración 0009) y sin ningún
 * refresh_continuous_aggregate manual no muestran datos de real-time
 * aggregation para timestamps anteriores a su creación (verificado en CI:
 * la agregación real-time no cubre ese caso como se asumió al diseñar el
 * esquema). La solución robusta es refrescar la ventana recién insertada
 * en cada flush, acotada al rango del lote + el ancho del bucket más
 * grueso, así el costo no depende del volumen histórico de la tabla.
 */
const VISTAS_CONTINUOUS_AGGREGATE: ReadonlyArray<{ nombre: string; paddingMs: number }> = [
  { nombre: "reading_agg_5m", paddingMs: 5 * 60 * 1000 },
  { nombre: "reading_agg_1h", paddingMs: 60 * 60 * 1000 },
  { nombre: "reading_agg_1d", paddingMs: 24 * 60 * 60 * 1000 },
];

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

    const tiempos = lecturas.map((lectura) => lectura.ts.getTime());
    await this.refrescarContinuousAggregates(new Date(Math.min(...tiempos)), new Date(Math.max(...tiempos)));
  }

  private async refrescarContinuousAggregates(desde: Date, hasta: Date): Promise<void> {
    for (const vista of VISTAS_CONTINUOUS_AGGREGATE) {
      const inicio = new Date(desde.getTime() - vista.paddingMs);
      const fin = new Date(hasta.getTime() + vista.paddingMs);
      await this.db.execute(
        sql`CALL refresh_continuous_aggregate(${sql.raw(`'${vista.nombre}'`)}::regclass, ${inicio}, ${fin})`,
      );
    }
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
