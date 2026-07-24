import type { TipoArchivoDocumento } from "../entities/documento";

export interface TextoExtraido {
  readonly texto: string;
  readonly totalPaginas: number | null;
  /** Texto por página, 1:1 con el número de página (solo cuando el formato tiene páginas, p. ej. PDF). */
  readonly paginas: readonly string[] | null;
}

/** Adapter: extrae texto plano de un archivo binario según su tipo. */
export interface ExtractorTexto {
  extraer(contenido: Buffer, tipo: TipoArchivoDocumento): Promise<TextoExtraido>;
}
