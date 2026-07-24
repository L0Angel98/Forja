import { ErrorDominio } from "@forja/shared";

export class ManifiestoConectorInvalido extends ErrorDominio {
  readonly codigo = "MANIFIESTO_CONECTOR_INVALIDO";

  constructor(readonly detalle: string) {
    super(`El manifiesto del conector no es válido: ${detalle}`);
  }
}
