import { ErrorDominio } from "@forja/shared";

export class RutinaHerramientaDesconocida extends ErrorDominio {
  readonly codigo = "RUTINA_HERRAMIENTA_DESCONOCIDA";

  constructor(readonly nombreHerramienta: string) {
    super(`La herramienta "${nombreHerramienta}" no existe en el registry.`);
  }
}
