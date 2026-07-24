import { ErrorDominio } from "@forja/shared";

export class SesionInvalida extends ErrorDominio {
  readonly codigo = "SESION_INVALIDA";

  constructor() {
    super("La sesión no existe, expiró o el usuario fue desactivado.");
  }
}
