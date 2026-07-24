import { ErrorDominio } from "@forja/shared";

export class SintomaRequerido extends ErrorDominio {
  readonly codigo = "SINTOMA_REQUERIDO";

  constructor() {
    super("Indica un síntoma de la taxonomía o descríbelo en 'otro'.");
  }
}
