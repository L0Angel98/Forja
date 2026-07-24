import { ErrorDominio } from "@forja/shared";

export class RutinaNoEncontrada extends ErrorDominio {
  readonly codigo = "RUTINA_NO_ENCONTRADA";

  constructor() {
    super("La rutina indicada no existe.");
  }
}
