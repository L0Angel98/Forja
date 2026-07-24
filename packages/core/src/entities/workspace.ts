export interface ArchivoWorkspaceInvalido {
  readonly ruta: string;
  readonly error: string;
}

export interface ConfiguracionWorkspace {
  readonly soul: string;
  readonly planta: string;
  readonly memoria: string;
  readonly advertencias: readonly string[];
  readonly archivosInvalidos: readonly ArchivoWorkspaceInvalido[];
}

export type ArchivoWorkspaceEditable = "soul" | "planta";

export const TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES = 20 * 1024;
