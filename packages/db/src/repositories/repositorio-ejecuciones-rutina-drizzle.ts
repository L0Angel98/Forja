import type { EjecucionRutina, EstadoEjecucionRutina, RepositorioEjecucionesRutina } from "@forja/core";
import { and, desc, eq, gte, isNull, sum } from "drizzle-orm";
import type { ForjaDb } from "../client";
import { routineExecution } from "../schema/routine-execution";

export class RepositorioEjecucionesRutinaDrizzle implements RepositorioEjecucionesRutina {
  constructor(private readonly db: ForjaDb) {}

  async crear(ejecucion: EjecucionRutina): Promise<void> {
    await this.db.insert(routineExecution).values({
      id: ejecucion.id,
      rutinaNombre: ejecucion.rutinaNombre,
      plantId: ejecucion.plantId,
      iniciadaEn: ejecucion.iniciadaEn,
      finalizadaEn: ejecucion.finalizadaEn,
      estado: ejecucion.estado,
      tokensUsados: ejecucion.tokensUsados,
      costoUsd: ejecucion.costoUsd,
      salida: ejecucion.salida,
      error: ejecucion.error,
    });
  }

  async listarPorRutina(rutinaNombre: string, limite: number): Promise<EjecucionRutina[]> {
    const filas = await this.db
      .select()
      .from(routineExecution)
      .where(eq(routineExecution.rutinaNombre, rutinaNombre))
      .orderBy(desc(routineExecution.iniciadaEn))
      .limit(limite);
    return filas.map(mapear);
  }

  async hayEnCurso(rutinaNombre: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ id: routineExecution.id })
      .from(routineExecution)
      .where(and(eq(routineExecution.rutinaNombre, rutinaNombre), isNull(routineExecution.finalizadaEn)))
      .limit(1);
    return fila !== undefined;
  }

  async tokensUsadosDesde(plantId: string, desde: Date): Promise<number> {
    const [fila] = await this.db
      .select({ total: sum(routineExecution.tokensUsados) })
      .from(routineExecution)
      .where(and(eq(routineExecution.plantId, plantId), gte(routineExecution.iniciadaEn, desde)));
    return Number(fila?.total ?? 0);
  }
}

function mapear(fila: typeof routineExecution.$inferSelect): EjecucionRutina {
  return {
    id: fila.id,
    rutinaNombre: fila.rutinaNombre,
    plantId: fila.plantId,
    iniciadaEn: fila.iniciadaEn,
    finalizadaEn: fila.finalizadaEn,
    estado: fila.estado as EstadoEjecucionRutina,
    tokensUsados: fila.tokensUsados,
    costoUsd: fila.costoUsd,
    salida: fila.salida,
    error: fila.error,
  };
}
