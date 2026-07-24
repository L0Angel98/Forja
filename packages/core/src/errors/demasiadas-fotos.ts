import { ErrorDominio } from "@forja/shared";

const MAXIMO_FOTOS = 5;

export class DemasiadasFotos extends ErrorDominio {
  readonly codigo = "DEMASIADAS_FOTOS";

  constructor() {
    super(`Máximo ${MAXIMO_FOTOS} fotos por reporte.`);
  }
}

export { MAXIMO_FOTOS };
