import { ErrorDominio } from "@forja/shared";

export class ConectoresYamlSecretoInline extends ErrorDominio {
  readonly codigo = "CONECTORES_YAML_SECRETO_INLINE";

  constructor(readonly detalle: string) {
    super(
      `conectores.yaml no acepta secretos inline: ${detalle}. ` +
        "Las credenciales deben referirse por el NOMBRE de una variable de entorno.",
    );
  }
}
