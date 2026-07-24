import type { Documento, TipoArchivoDocumento } from "../entities/documento";
import { MAXIMO_BYTES_DOCUMENTO } from "../entities/documento";
import { DocumentoDemasiadoGrande } from "../errors/documento-demasiado-grande";
import { DocumentoNoEncontrado } from "../errors/documento-no-encontrado";
import type { AlmacenArchivos } from "../ports/almacen-archivos";
import type { ColaTrabajos } from "../ports/cola-trabajos";
import type { RepositorioChunks } from "../ports/repositorio-chunks";
import type { RepositorioDocumentos } from "../ports/repositorio-documentos";
import { TRABAJO_INDEXAR_DOCUMENTO } from "./cargar-documento";

export interface DependenciasReemplazarVersionDocumento {
  documentos: RepositorioDocumentos;
  chunks: RepositorioChunks;
  almacen: AlmacenArchivos;
  cola: ColaTrabajos;
  generarId: () => string;
}

export interface ParametrosReemplazarVersionDocumento {
  documentoAnteriorId: string;
  nombre: string;
  tipoArchivo: TipoArchivoDocumento;
  contenido: Buffer;
  subidoPor: string;
  ahora: Date;
}

export async function reemplazarVersionDocumento(
  deps: DependenciasReemplazarVersionDocumento,
  params: ParametrosReemplazarVersionDocumento,
): Promise<Documento> {
  const anterior = await deps.documentos.buscarPorId(params.documentoAnteriorId);
  if (!anterior) throw new DocumentoNoEncontrado();

  if (params.contenido.byteLength > MAXIMO_BYTES_DOCUMENTO) {
    throw new DocumentoDemasiadoGrande();
  }

  const rutaAlmacenada = await deps.almacen.guardar(params.nombre, params.contenido);

  const nuevo: Documento = {
    id: deps.generarId(),
    nombre: params.nombre,
    tipoArchivo: params.tipoArchivo,
    rutaAlmacenada,
    tamanoBytes: params.contenido.byteLength,
    asociaciones: anterior.asociaciones,
    version: anterior.version + 1,
    documentoAnteriorId: anterior.id,
    vigente: true,
    estadoIndexacion: "pendiente",
    subidoPor: params.subidoPor,
    creadoEn: params.ahora,
  };

  await deps.documentos.crear(nuevo);
  await deps.documentos.actualizarVigencia(anterior.id, false);
  await deps.chunks.marcarNoVigentesPorDocumento(anterior.id);
  await deps.cola.encolar(TRABAJO_INDEXAR_DOCUMENTO, { documentoId: nuevo.id });

  return nuevo;
}
