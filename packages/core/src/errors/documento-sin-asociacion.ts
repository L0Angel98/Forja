import { ErrorDominio } from "@forja/shared";

export class DocumentoSinAsociacion extends ErrorDominio {
  readonly codigo = "DOCUMENTO_SIN_ASOCIACION";

  constructor() {
    super("El documento necesita al menos una máquina, área o familia de máquinas asociada.");
  }
}
