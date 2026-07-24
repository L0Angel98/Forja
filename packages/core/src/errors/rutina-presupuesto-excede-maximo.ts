import { ErrorDominio } from "@forja/shared";

export class RutinaPresupuestoExcedeMaximo extends ErrorDominio {
  readonly codigo = "RUTINA_PRESUPUESTO_EXCEDE_MAXIMO";

  constructor() {
    super("El presupuesto de tokens de la rutina excede el máximo global configurado.");
  }
}
