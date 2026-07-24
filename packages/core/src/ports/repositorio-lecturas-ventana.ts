import type { LecturaSensor } from "../entities/sensor";

export interface RepositorioLecturasVentana {
  leerVentana(sensorId: string, desde: Date, hasta: Date): Promise<LecturaSensor[]>;
}
