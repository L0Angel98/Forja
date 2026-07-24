export const TIPOS_ARCHIVO_DOCUMENTO = ["pdf", "docx", "md"] as const;
export type TipoArchivoDocumento = (typeof TIPOS_ARCHIVO_DOCUMENTO)[number];

export const MAXIMO_BYTES_DOCUMENTO = 50 * 1024 * 1024;

export const ESTADOS_INDEXACION = ["pendiente", "indexando", "indexado", "fallido"] as const;
export type EstadoIndexacion = (typeof ESTADOS_INDEXACION)[number];

export interface AsociacionesDocumento {
  readonly maquinaIds: readonly string[];
  readonly areaIds: readonly string[];
  readonly familiaIds: readonly string[];
}

export interface Documento {
  readonly id: string;
  readonly nombre: string;
  readonly tipoArchivo: TipoArchivoDocumento;
  readonly rutaAlmacenada: string;
  readonly tamanoBytes: number;
  readonly asociaciones: AsociacionesDocumento;
  readonly version: number;
  readonly documentoAnteriorId: string | null;
  readonly vigente: boolean;
  readonly estadoIndexacion: EstadoIndexacion;
  readonly subidoPor: string;
  readonly creadoEn: Date;
}
