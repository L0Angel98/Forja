import { ErrorDominio } from "@forja/shared";

export class RutinaCanalInvalido extends ErrorDominio {
  readonly codigo = "RUTINA_CANAL_INVALIDO";

  constructor() {
    super("El canal de salida de la rutina no es válido. Usa correo:{grupo}, webhook:{url} o ui.");
  }
}
