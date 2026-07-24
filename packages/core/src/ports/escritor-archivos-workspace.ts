import type { ArchivoWorkspaceEditable } from "../entities/workspace";

export interface EscritorArchivosWorkspace {
  leer(archivo: ArchivoWorkspaceEditable): Promise<string>;
  escribir(archivo: ArchivoWorkspaceEditable, contenido: string): Promise<void>;
}
