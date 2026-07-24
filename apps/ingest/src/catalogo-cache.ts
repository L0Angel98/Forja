import type { RepositorioCatalogoSensores, SensorCatalogo } from "@forja/core";

/**
 * Cache en memoria del catálogo de sensores, indexada por external_id (el
 * segmento del tópico MQTT). Se refresca periódicamente en vez de consultar
 * la DB en cada mensaje: a 5k msg/s un round-trip por lectura es inviable.
 */
export class CacheCatalogoSensores {
  private porExternalId = new Map<string, SensorCatalogo>();

  constructor(private readonly catalogo: RepositorioCatalogoSensores) {}

  async refrescar(): Promise<void> {
    const sensores = await this.catalogo.listar();
    const siguiente = new Map<string, SensorCatalogo>();
    for (const sensor of sensores) {
      siguiente.set(sensor.externalId, sensor);
    }
    this.porExternalId = siguiente;
  }

  buscarPorExternalId(externalId: string): SensorCatalogo | null {
    return this.porExternalId.get(externalId) ?? null;
  }

  iniciarRefrescoPeriodico(intervaloMs: number, logger: Pick<Console, "error"> = console): () => void {
    const timer = setInterval(() => {
      this.refrescar().catch((error: unknown) => {
        logger.error("ingest: fallo al refrescar el catálogo de sensores", error);
      });
    }, intervaloMs);
    timer.unref();
    return () => clearInterval(timer);
  }
}
