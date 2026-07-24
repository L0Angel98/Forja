import { ErrorDominio } from "@forja/shared";

export class SugerenciaMemoriaYaResuelta extends ErrorDominio {
  readonly codigo = "SUGERENCIA_MEMORIA_YA_RESUELTA";

  constructor() {
    super("Esta sugerencia de memoria ya fue aprobada o rechazada.");
  }
}
