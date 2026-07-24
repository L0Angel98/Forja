import { ErrorDominio } from "@forja/shared";

export class RutinaFrontmatterInvalido extends ErrorDominio {
  readonly codigo = "RUTINA_FRONTMATTER_INVALIDO";

  constructor(readonly detalle: string) {
    super(`El frontmatter de la rutina no es válido: ${detalle}`);
  }
}
