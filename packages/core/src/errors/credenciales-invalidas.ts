import { ErrorDominio } from "@forja/shared";

export class CredencialesInvalidas extends ErrorDominio {
  readonly codigo = "CREDENCIALES_INVALIDAS";

  constructor() {
    super("Email o contraseña incorrectos.");
  }
}
