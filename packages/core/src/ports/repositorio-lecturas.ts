import type { LecturaIngerida } from "../entities/lectura-ingerida";

export interface RepositorioLecturas {
  insertarLote(lecturas: readonly LecturaIngerida[]): Promise<void>;
  ultimaLecturaEn(sensorId: string): Promise<Date | null>;
}
