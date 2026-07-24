import { ErrorDominio } from "@forja/shared";

export class PermisoDenegado extends ErrorDominio {
  readonly codigo = "PERMISO_DENEGADO";

  constructor() {
    super("No tienes permiso para realizar esta acción.");
  }
}
