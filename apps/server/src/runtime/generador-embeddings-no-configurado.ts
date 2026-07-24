import type { GeneradorEmbeddings } from "@forja/core";

/**
 * Reserva cuando no hay credenciales de un proveedor de embeddings real.
 * indexarDocumento propaga el error y el documento queda en
 * estadoIndexacion "fallido" (visible en la UI de admin); buscar_documentos
 * atrapa el error en el loop del agente igual que cualquier otra
 * herramienta y sigue sin romper el chat.
 */
export class GeneradorEmbeddingsNoConfigurado implements GeneradorEmbeddings {
  readonly dimensiones = 0;

  async generar(): Promise<never> {
    throw new Error("No hay un proveedor de embeddings configurado en este despliegue.");
  }
}
