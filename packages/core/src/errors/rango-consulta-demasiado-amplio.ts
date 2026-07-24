import { ErrorDominio } from "@forja/shared";
import { RANGO_MAXIMO_DIAS } from "../entities/agregacion-sensor";

export class RangoConsultaDemasiadoAmplio extends ErrorDominio {
  readonly codigo = "RANGO_CONSULTA_DEMASIADO_AMPLIO";

  constructor() {
    super(`El rango de consulta no puede superar ${RANGO_MAXIMO_DIAS} días.`);
  }
}
