import {
  materializarSnapshotFalla,
  TRABAJO_MATERIALIZAR_SNAPSHOT,
  type DependenciasMaterializarSnapshotFalla,
} from "@forja/core";
import type PgBoss from "pg-boss";

const REINTENTOS_SNAPSHOT = 3;

interface PayloadMaterializarSnapshot {
  failureReportId: string;
  machineId: string;
  ocurridoEn: string;
}

/** Registra el job pg-boss (con reintentos) que materializa el snapshot de sensores de una falla. */
export async function registrarWorkerSnapshotFalla(
  boss: PgBoss,
  deps: DependenciasMaterializarSnapshotFalla,
): Promise<void> {
  await boss.createQueue(TRABAJO_MATERIALIZAR_SNAPSHOT, {
    name: TRABAJO_MATERIALIZAR_SNAPSHOT,
    retryLimit: REINTENTOS_SNAPSHOT,
    retryBackoff: true,
  });

  await boss.work<PayloadMaterializarSnapshot>(TRABAJO_MATERIALIZAR_SNAPSHOT, async (jobs) => {
    for (const job of jobs) {
      await materializarSnapshotFalla(deps, {
        failureReportId: job.data.failureReportId,
        machineId: job.data.machineId,
        ocurridoEn: new Date(job.data.ocurridoEn),
      });
    }
  });
}
