import { eq } from "drizzle-orm";
import type { RepositorioSnapshotsFalla, SnapshotSensor } from "@forja/core";
import type { ForjaDb } from "../client";
import { failureSensorSnapshot } from "../schema/failure-sensor-snapshot";

export class RepositorioSnapshotsFallaDrizzle implements RepositorioSnapshotsFalla {
  constructor(private readonly db: ForjaDb) {}

  async crear(snapshot: SnapshotSensor): Promise<void> {
    await this.db.insert(failureSensorSnapshot).values({
      id: snapshot.id,
      failureReportId: snapshot.failureReportId,
      sensorId: snapshot.sensorId,
      ventanaInicio: snapshot.ventanaInicio,
      ventanaFin: snapshot.ventanaFin,
      min: snapshot.min,
      max: snapshot.max,
      avg: snapshot.avg,
      last: snapshot.last,
    });
  }

  async listarPorReporte(failureReportId: string): Promise<SnapshotSensor[]> {
    const filas = await this.db
      .select()
      .from(failureSensorSnapshot)
      .where(eq(failureSensorSnapshot.failureReportId, failureReportId));
    return filas.map(mapear);
  }
}

function mapear(fila: typeof failureSensorSnapshot.$inferSelect): SnapshotSensor {
  return {
    id: fila.id,
    failureReportId: fila.failureReportId,
    sensorId: fila.sensorId,
    ventanaInicio: fila.ventanaInicio,
    ventanaFin: fila.ventanaFin,
    min: fila.min,
    max: fila.max,
    avg: fila.avg,
    last: fila.last,
  };
}
