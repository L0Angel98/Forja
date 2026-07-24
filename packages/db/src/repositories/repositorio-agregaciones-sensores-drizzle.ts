import { and, eq, gte, lte } from "drizzle-orm";
import { doublePrecision, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { MAXIMO_PUNTOS_SERIE } from "@forja/core";
import type {
  Bucket,
  ParametrosConsultaAgregada,
  PuntoSerieAgregada,
  RepositorioAgregacionesSensores,
  SerieAgregada,
  TipoAgregacion,
} from "@forja/core";
import type { ForjaDb } from "../client";

/**
 * Vistas materializadas (continuous aggregates) creadas por la migración
 * custom 0009. No viven en schema/index.ts a propósito: son de solo lectura
 * y drizzle-kit generate no debe intentar gestionarlas como tablas.
 */
function vistaAgregada(nombre: string) {
  return pgTable(nombre, {
    sensorId: uuid("sensor_id").notNull(),
    bucket: timestamp("bucket", { withTimezone: true }).notNull(),
    minValor: doublePrecision("min_valor"),
    maxValor: doublePrecision("max_valor"),
    avgValor: doublePrecision("avg_valor"),
    countValor: integer("count_valor"),
    lastValor: doublePrecision("last_valor"),
  });
}

type VistaAgregada = ReturnType<typeof vistaAgregada>;

const readingAgg5m = vistaAgregada("reading_agg_5m");
const readingAgg1h = vistaAgregada("reading_agg_1h");
const readingAgg1d = vistaAgregada("reading_agg_1d");

const VISTA_POR_BUCKET: Record<Bucket, VistaAgregada> = {
  "5m": readingAgg5m,
  "1h": readingAgg1h,
  "1d": readingAgg1d,
};

/** El LLM nunca elige la vista directamente: consultar() escala del bucket pedido hacia uno más grueso si excede MAXIMO_PUNTOS_SERIE. */
const ORDEN_ESCALADA: Record<Bucket, readonly Bucket[]> = {
  "5m": ["5m", "1h", "1d"],
  "1h": ["1h", "1d"],
  "1d": ["1d"],
};

function columnaPara(vista: VistaAgregada, agregacion: TipoAgregacion) {
  switch (agregacion) {
    case "min":
      return vista.minValor;
    case "max":
      return vista.maxValor;
    case "avg":
      return vista.avgValor;
    case "count":
      return vista.countValor;
    case "last":
      return vista.lastValor;
  }
}

export class RepositorioAgregacionesSensoresDrizzle implements RepositorioAgregacionesSensores {
  constructor(private readonly db: ForjaDb) {}

  async consultar(params: ParametrosConsultaAgregada): Promise<SerieAgregada> {
    const candidatos = ORDEN_ESCALADA[params.bucket];
    for (let i = 0; i < candidatos.length; i++) {
      const bucketActual = candidatos[i]!;
      const puntos = await this.consultarBucket(params, bucketActual);
      const esUltimoCandidato = i === candidatos.length - 1;
      if (puntos.length <= MAXIMO_PUNTOS_SERIE || esUltimoCandidato) {
        return {
          sensorId: params.sensorId,
          agregacion: params.agregacion,
          bucket: bucketActual,
          puntos,
          reBucketizado: bucketActual !== params.bucket,
        };
      }
    }
    throw new Error("inalcanzable: ORDEN_ESCALADA siempre tiene al menos un candidato");
  }

  private async consultarBucket(
    params: ParametrosConsultaAgregada,
    bucket: Bucket,
  ): Promise<PuntoSerieAgregada[]> {
    const vista = VISTA_POR_BUCKET[bucket];
    const columna = columnaPara(vista, params.agregacion);
    const filas = await this.db
      .select({ bucket: vista.bucket, valor: columna })
      .from(vista)
      .where(and(eq(vista.sensorId, params.sensorId), gte(vista.bucket, params.desde), lte(vista.bucket, params.hasta)))
      .orderBy(vista.bucket);
    return filas.map((fila) => ({ bucket: fila.bucket, valor: fila.valor }));
  }
}
