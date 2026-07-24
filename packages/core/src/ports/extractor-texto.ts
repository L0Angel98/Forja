import type { TipoArchivoDocumento } from "../entities/documento";

export interface TextoExtraido {
  readonly texto: string;
  readonly totalPaginas: number | null;
}

/** Adapter: extrae texto plano de un archivo binario según su tipo. */
export interface ExtractorTexto {
  extraer(contenido: Buffer, tipo: TipoArchivoDocumento): Promise<TextoExtraido>;
}
