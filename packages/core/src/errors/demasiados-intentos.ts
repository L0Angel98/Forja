import { ErrorDominio } from "@forja/shared";

export class DemasiadosIntentos extends ErrorDominio {
  readonly codigo = "DEMASIADOS_INTENTOS";

  constructor() {
    super("Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.");
  }
}
