import { ErrorDominio } from "@forja/shared";

export class HerramientaNoPermitida extends ErrorDominio {
  readonly codigo = "HERRAMIENTA_NO_PERMITIDA";

  constructor(nombre: string) {
    super(`La herramienta "${nombre}" no existe o no está permitida para este rol.`);
  }
}
