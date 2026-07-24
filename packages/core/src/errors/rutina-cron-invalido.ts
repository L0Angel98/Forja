import { ErrorDominio } from "@forja/shared";

export class RutinaCronInvalido extends ErrorDominio {
  readonly codigo = "RUTINA_CRON_INVALIDO";

  constructor() {
    super("La expresión cron de la rutina no es válida.");
  }
}
