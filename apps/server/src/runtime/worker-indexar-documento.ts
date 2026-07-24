import { indexarDocumento, TRABAJO_INDEXAR_DOCUMENTO, type DependenciasIndexarDocumento } from "@forja/core";
import type PgBoss from "pg-boss";

const REINTENTOS_INDEXACION = 3;

interface PayloadIndexarDocumento {
  documentoId: string;
}

/** Registra el job pg-boss (con reintentos) que extrae texto, trocea y genera embeddings para un documento. */
export async function registrarWorkerIndexarDocumento(
  boss: PgBoss,
  deps: DependenciasIndexarDocumento,
): Promise<void> {
  await boss.createQueue(TRABAJO_INDEXAR_DOCUMENTO, {
    name: TRABAJO_INDEXAR_DOCUMENTO,
    retryLimit: REINTENTOS_INDEXACION,
    retryBackoff: true,
  });

  await boss.work<PayloadIndexarDocumento>(TRABAJO_INDEXAR_DOCUMENTO, async (jobs) => {
    for (const job of jobs) {
      await indexarDocumento(deps, { documentoId: job.data.documentoId });
    }
  });
}
