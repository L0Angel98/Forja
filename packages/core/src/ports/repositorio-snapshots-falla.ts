import type { SnapshotSensor } from "../entities/snapshot-sensor";

export interface RepositorioSnapshotsFalla {
  crear(snapshot: SnapshotSensor): Promise<void>;
  listarPorReporte(failureReportId: string): Promise<SnapshotSensor[]>;
}
