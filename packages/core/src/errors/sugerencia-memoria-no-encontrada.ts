import { ErrorDominio } from "@forja/shared";

export class SugerenciaMemoriaNoEncontrada extends ErrorDominio {
  readonly codigo = "SUGERENCIA_MEMORIA_NO_ENCONTRADA";

  constructor() {
    super("La sugerencia de memoria no existe.");
  }
}
