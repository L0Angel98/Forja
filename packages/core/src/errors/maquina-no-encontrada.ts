import { ErrorDominio } from "@forja/shared";

export class MaquinaNoEncontrada extends ErrorDominio {
  readonly codigo = "MAQUINA_NO_ENCONTRADA";

  constructor() {
    super("La máquina indicada no existe.");
  }
}
