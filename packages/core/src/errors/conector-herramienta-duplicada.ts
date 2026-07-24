import { ErrorDominio } from "@forja/shared";

export class ConectorHerramientaDuplicada extends ErrorDominio {
  readonly codigo = "CONECTOR_HERRAMIENTA_DUPLICADA";

  constructor(readonly nombreHerramienta: string) {
    super(`Ya existe una herramienta registrada con el nombre "${nombreHerramienta}".`);
  }
}
