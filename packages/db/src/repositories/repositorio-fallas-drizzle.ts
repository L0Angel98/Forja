import { and, eq, inArray } from "drizzle-orm";
import type { EstadoFalla, FiltrosListarFallas, RepositorioFallas, ReporteFalla, SintomaTaxonomia } from "@forja/core";
import type { ForjaDb } from "../client";
import { failureReport } from "../schema/failure-report";
import { machine } from "../schema/machine";

export class RepositorioFallasDrizzle implements RepositorioFallas {
  constructor(private readonly db: ForjaDb) {}

  async crear(reporte: ReporteFalla): Promise<void> {
    await this.db.insert(failureReport).values({
      id: reporte.id,
      machineId: reporte.machineId,
      reportadoPor: reporte.reportadoPor,
      sintomaTaxonomia: reporte.sintomaTaxonomia,
      sintomaOtro: reporte.sintomaOtro,
      descripcion: reporte.descripcion,
      severidad: reporte.severidad,
      fotos: reporte.fotos,
      origen: reporte.origen,
      estado: reporte.estado,
      createdAt: reporte.creadoEn,
    });
  }

  async buscarPorId(id: string): Promise<ReporteFalla | null> {
    const [fila] = await this.db.select().from(failureReport).where(eq(failureReport.id, id)).limit(1);
    return fila ? mapear(fila) : null;
  }

  async actualizarEstado(id: string, estado: EstadoFalla): Promise<void> {
    await this.db.update(failureReport).set({ estado }).where(eq(failureReport.id, id));
  }

  async listar(filtros: FiltrosListarFallas): Promise<ReporteFalla[]> {
    const condiciones = [];
    if (filtros.machineId) condiciones.push(eq(failureReport.machineId, filtros.machineId));
    if (filtros.estado) condiciones.push(eq(failureReport.estado, filtros.estado));
    if (filtros.severidad) condiciones.push(eq(failureReport.severidad, filtros.severidad));

    if (filtros.areaIds && filtros.areaIds.length > 0) {
      condiciones.push(inArray(machine.areaId, [...filtros.areaIds]));
      const filas = await this.db
        .select({ falla: failureReport })
        .from(failureReport)
        .innerJoin(machine, eq(failureReport.machineId, machine.id))
        .where(and(...condiciones));
      return filas.map((fila) => mapear(fila.falla));
    }

    const filas = await this.db
      .select()
      .from(failureReport)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined);
    return filas.map(mapear);
  }
}

function mapear(fila: typeof failureReport.$inferSelect): ReporteFalla {
  return {
    id: fila.id,
    machineId: fila.machineId,
    reportadoPor: fila.reportadoPor,
    sintomaTaxonomia: fila.sintomaTaxonomia as SintomaTaxonomia | null,
    sintomaOtro: fila.sintomaOtro,
    descripcion: fila.descripcion,
    severidad: fila.severidad as ReporteFalla["severidad"],
    fotos: fila.fotos as string[],
    origen: fila.origen as ReporteFalla["origen"],
    estado: fila.estado as EstadoFalla,
    creadoEn: fila.createdAt,
  };
}
