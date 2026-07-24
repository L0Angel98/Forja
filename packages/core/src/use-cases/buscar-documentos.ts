import type { CitaDocumento } from "../entities/chunk-documento";
import type { GeneradorEmbeddings } from "../ports/generador-embeddings";
import type { RepositorioChunks } from "../ports/repositorio-chunks";

export const TOP_K_RETRIEVAL_POR_DEFECTO = 6;
export const UMBRAL_SIMILITUD_POR_DEFECTO = 0.75;

export interface DependenciasBuscarDocumentos {
  embeddings: GeneradorEmbeddings;
  chunks: RepositorioChunks;
}

export interface ParametrosBuscarDocumentos {
  consulta: string;
  areaIds?: readonly string[];
  maquinaId?: string;
  topK?: number;
  umbralSimilitud?: number;
}

/**
 * Retrieval de la feature RAG. Si no hay chunks por encima del umbral,
 * devuelve un arreglo vacío: es responsabilidad de quien la invoca (la
 * herramienta buscar_documentos) decirle al LLM que no encontró información
 * en vez de inventar una respuesta.
 */
export async function buscarDocumentos(
  deps: DependenciasBuscarDocumentos,
  params: ParametrosBuscarDocumentos,
): Promise<readonly CitaDocumento[]> {
  const [embeddingConsulta] = await deps.embeddings.generar([params.consulta]);
  if (!embeddingConsulta) return [];

  return deps.chunks.buscarSimilares(embeddingConsulta, {
    ...(params.areaIds !== undefined ? { areaIds: params.areaIds } : {}),
    ...(params.maquinaId !== undefined ? { maquinaId: params.maquinaId } : {}),
    topK: params.topK ?? TOP_K_RETRIEVAL_POR_DEFECTO,
    umbralSimilitud: params.umbralSimilitud ?? UMBRAL_SIMILITUD_POR_DEFECTO,
  });
}
