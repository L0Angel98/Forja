import type { AsociacionesDocumento, Documento, TipoArchivoDocumento } from "../entities/documento";
import { MAXIMO_BYTES_DOCUMENTO } from "../entities/documento";
import { DocumentoDemasiadoGrande } from "../errors/documento-demasiado-grande";
import { DocumentoSinAsociacion } from "../errors/documento-sin-asociacion";
import type { AlmacenArchivos } from "../ports/almacen-archivos";
import type { ColaTrabajos } from "../ports/cola-trabajos";
import type { RepositorioDocumentos } from "../ports/repositorio-documentos";

export const TRABAJO_INDEXAR_DOCUMENTO = "indexar-documento";

export interface DependenciasCargarDocumento {
  documentos: RepositorioDocumentos;
  almacen: AlmacenArchivos;
  cola: ColaTrabajos;
  generarId: () => string;
}

export interface ParametrosCargarDocumento {
  nombre: string;
  tipoArchivo: TipoArchivoDocumento;
  contenido: Buffer;
  asociaciones: AsociacionesDocumento;
  subidoPor: string;
  ahora: Date;
}

export async function cargarDocumento(
  deps: DependenciasCargarDocumento,
  params: ParametrosCargarDocumento,
): Promise<Documento> {
  if (params.contenido.byteLength > MAXIMO_BYTES_DOCUMENTO) {
    throw new DocumentoDemasiadoGrande();
  }
  if (
    params.asociaciones.maquinaIds.length === 0 &&
    params.asociaciones.areaIds.length === 0 &&
    params.asociaciones.familiaIds.length === 0
  ) {
    throw new DocumentoSinAsociacion();
  }

  const rutaAlmacenada = await deps.almacen.guardar(params.nombre, params.contenido);

  const documento: Documento = {
    id: deps.generarId(),
    nombre: params.nombre,
    tipoArchivo: params.tipoArchivo,
    rutaAlmacenada,
    tamanoBytes: params.contenido.byteLength,
    asociaciones: params.asociaciones,
    version: 1,
    documentoAnteriorId: null,
    vigente: true,
    estadoIndexacion: "pendiente",
    subidoPor: params.subidoPor,
    creadoEn: params.ahora,
  };

  await deps.documentos.crear(documento);
  await deps.cola.encolar(TRABAJO_INDEXAR_DOCUMENTO, { documentoId: documento.id });

  return documento;
}
