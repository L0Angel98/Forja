import { ErrorDominio } from "@forja/shared";

export class ConectorDesconocido extends ErrorDominio {
  readonly codigo = "CONECTOR_DESCONOCIDO";

  constructor(readonly nombreConector: string) {
    super(`No existe un conector activo llamado "${nombreConector}".`);
  }
}
