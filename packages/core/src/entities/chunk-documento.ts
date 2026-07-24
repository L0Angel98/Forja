export interface ChunkDocumento {
  readonly id: string;
  readonly documentoId: string;
  readonly indice: number;
  readonly contenido: string;
  readonly seccion: string | null;
  readonly pagina: number | null;
  readonly embedding: readonly number[];
  readonly vigente: boolean;
}

export interface ChunkTroceado {
  readonly contenido: string;
  readonly seccion: string | null;
  readonly pagina: number | null;
}

export interface CitaDocumento {
  readonly documentoId: string;
  readonly documentoNombre: string;
  readonly contenido: string;
  readonly seccion: string | null;
  readonly pagina: number | null;
  readonly similitud: number;
}
