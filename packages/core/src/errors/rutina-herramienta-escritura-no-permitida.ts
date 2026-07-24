import { ErrorDominio } from "@forja/shared";

export class RutinaHerramientaEscrituraNoPermitida extends ErrorDominio {
  readonly codigo = "RUTINA_HERRAMIENTA_ESCRITURA_NO_PERMITIDA";

  constructor(readonly nombreHerramienta: string) {
    super(`La herramienta "${nombreHerramienta}" puede escribir/mutar estado: las rutinas solo pueden usar herramientas de solo lectura.`);
  }
}
