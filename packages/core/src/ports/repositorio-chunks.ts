import type { ChunkDocumento, CitaDocumento } from "../entities/chunk-documento";

export interface FiltrosBuscarSimilares {
  readonly areaIds?: readonly string[];
  readonly maquinaId?: string;
  readonly topK: number;
  readonly umbralSimilitud: number;
}

export interface RepositorioChunks {
  crearMuchos(chunks: readonly ChunkDocumento[]): Promise<void>;
  buscarPorDocumento(documentoId: string): Promise<ChunkDocumento[]>;
  marcarNoVigentesPorDocumento(documentoId: string): Promise<void>;
  buscarSimilares(embeddingConsulta: readonly number[], filtros: FiltrosBuscarSimilares): Promise<CitaDocumento[]>;
}
