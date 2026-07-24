import { ErrorDominio } from "@forja/shared";
import type { EstadoFalla } from "../entities/falla";

export class TransicionEstadoInvalida extends ErrorDominio {
  readonly codigo = "TRANSICION_ESTADO_INVALIDA";

  constructor(actual: EstadoFalla, siguiente: EstadoFalla) {
    super(`No se puede pasar de "${actual}" a "${siguiente}".`);
  }
}
