import { ErrorDominio } from "@forja/shared";

export class ConectoresYamlInvalido extends ErrorDominio {
  readonly codigo = "CONECTORES_YAML_INVALIDO";

  constructor(readonly detalle: string) {
    super(`conectores.yaml no es válido: ${detalle}`);
  }
}
