import { ErrorDominio } from "@forja/shared";
import { TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES } from "../entities/workspace";

export class ArchivoWorkspaceDemasiadoGrande extends ErrorDominio {
  readonly codigo = "ARCHIVO_WORKSPACE_DEMASIADO_GRANDE";

  constructor() {
    super(`El archivo supera el máximo de ${TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES / 1024}KB.`);
  }
}
