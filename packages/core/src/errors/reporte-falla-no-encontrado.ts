import { ErrorDominio } from "@forja/shared";

export class ReporteFallaNoEncontrado extends ErrorDominio {
  readonly codigo = "REPORTE_FALLA_NO_ENCONTRADO";

  constructor() {
    super("El reporte de falla no existe.");
  }
}
