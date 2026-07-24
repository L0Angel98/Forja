import { DocumentoNoEncontrado } from "../errors/documento-no-encontrado";
import type { RepositorioChunks } from "../ports/repositorio-chunks";
import type { RepositorioDocumentos } from "../ports/repositorio-documentos";

export interface DependenciasEliminarDocumento {
  documentos: RepositorioDocumentos;
  chunks: RepositorioChunks;
}

export interface ParametrosEliminarDocumento {
  id: string;
}

/** Soft delete: marca el documento (y sus chunks) como no vigentes; nunca se borra el registro. */
export async function eliminarDocumento(
  deps: DependenciasEliminarDocumento,
  params: ParametrosEliminarDocumento,
): Promise<void> {
  const documento = await deps.documentos.buscarPorId(params.id);
  if (!documento) throw new DocumentoNoEncontrado();

  await deps.documentos.actualizarVigencia(params.id, false);
  await deps.chunks.marcarNoVigentesPorDocumento(params.id);
}
