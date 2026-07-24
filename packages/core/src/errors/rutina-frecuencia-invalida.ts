import { ErrorDominio } from "@forja/shared";

export class RutinaFrecuenciaInvalida extends ErrorDominio {
  readonly codigo = "RUTINA_FRECUENCIA_INVALIDA";

  constructor() {
    super("La rutina no puede ejecutarse más seguido que cada 5 minutos.");
  }
}
