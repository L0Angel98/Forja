import { ErrorDominio } from "@forja/shared";

export class MaquinaFueraDeArea extends ErrorDominio {
  readonly codigo = "MAQUINA_FUERA_DE_AREA";

  constructor() {
    super("Esa máquina no pertenece a tus áreas asignadas.");
  }
}
