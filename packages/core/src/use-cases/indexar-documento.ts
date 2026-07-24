import type { ChunkDocumento } from "../entities/chunk-documento";
import { DocumentoNoEncontrado } from "../errors/documento-no-encontrado";
import type { AlmacenArchivos } from "../ports/almacen-archivos";
import type { ExtractorTexto } from "../ports/extractor-texto";
import type { GeneradorEmbeddings } from "../ports/generador-embeddings";
import type { RepositorioChunks } from "../ports/repositorio-chunks";
import type { RepositorioDocumentos } from "../ports/repositorio-documentos";
import type { SelectorEstrategiaChunking } from "../ports/selector-estrategia-chunking";

export interface DependenciasIndexarDocumento {
  documentos: RepositorioDocumentos;
  almacen: AlmacenArchivos;
  extractor: ExtractorTexto;
  selectorEstrategia: SelectorEstrategiaChunking;
  embeddings: GeneradorEmbeddings;
  chunks: RepositorioChunks;
  generarId: () => string;
}

export interface ParametrosIndexarDocumento {
  documentoId: string;
}

export async function indexarDocumento(
  deps: DependenciasIndexarDocumento,
  params: ParametrosIndexarDocumento,
): Promise<void> {
  const documento = await deps.documentos.buscarPorId(params.documentoId);
  if (!documento) throw new DocumentoNoEncontrado();

  await deps.documentos.actualizarEstadoIndexacion(documento.id, "indexando");

  try {
    const contenido = await deps.almacen.leer(documento.rutaAlmacenada);
    const textoExtraido = await deps.extractor.extraer(contenido, documento.tipoArchivo);
    const estrategia = deps.selectorEstrategia.seleccionar(documento.tipoArchivo);
    const troceados = estrategia.trocear(textoExtraido);

    const embeddings = troceados.length > 0 ? await deps.embeddings.generar(troceados.map((t) => t.contenido)) : [];

    const chunks: ChunkDocumento[] = troceados.map((troceado, indice) => ({
      id: deps.generarId(),
      documentoId: documento.id,
      indice,
      contenido: troceado.contenido,
      seccion: troceado.seccion,
      pagina: troceado.pagina,
      embedding: embeddings[indice] ?? [],
      vigente: true,
    }));

    if (chunks.length > 0) {
      await deps.chunks.crearMuchos(chunks);
    }

    await deps.documentos.actualizarEstadoIndexacion(documento.id, "indexado");
  } catch (error) {
    await deps.documentos.actualizarEstadoIndexacion(documento.id, "fallido");
    throw error;
  }
}
