import { ErrorDominio } from "@forja/shared";
import { TIPOS_ARCHIVO_DOCUMENTO } from "../entities/documento";

export class FormatoDocumentoNoSoportado extends ErrorDominio {
  readonly codigo = "FORMATO_DOCUMENTO_NO_SOPORTADO";

  constructor() {
    super(`Formato no soportado. Formatos válidos: ${TIPOS_ARCHIVO_DOCUMENTO.join(", ")}.`);
  }
}
