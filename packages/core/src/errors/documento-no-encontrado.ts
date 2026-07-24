import { ErrorDominio } from "@forja/shared";

export class DocumentoNoEncontrado extends ErrorDominio {
  readonly codigo = "DOCUMENTO_NO_ENCONTRADO";

  constructor() {
    super("El documento no existe.");
  }
}
