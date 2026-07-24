import { ErrorDominio } from "@forja/shared";

export class ConectorNoDisponible extends ErrorDominio {
  readonly codigo = "CONECTOR_NO_DISPONIBLE";

  constructor(readonly nombreConector: string) {
    super(`El conector "${nombreConector}" no está disponible en este momento.`);
  }
}
