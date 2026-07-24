import { ErrorDominio } from "@forja/shared";

export class SensorNoEncontrado extends ErrorDominio {
  readonly codigo = "SENSOR_NO_ENCONTRADO";

  constructor() {
    super("El sensor no existe o no pertenece a la máquina indicada.");
  }
}
