import { ErrorDominio } from "@forja/shared";
import { MAXIMO_BYTES_DOCUMENTO } from "../entities/documento";

export class DocumentoDemasiadoGrande extends ErrorDominio {
  readonly codigo = "DOCUMENTO_DEMASIADO_GRANDE";

  constructor() {
    super(`El documento supera el máximo de ${MAXIMO_BYTES_DOCUMENTO / (1024 * 1024)}MB.`);
  }
}
