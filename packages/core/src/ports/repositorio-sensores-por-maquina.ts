import type { SensorInfo } from "../entities/sensor";

export interface RepositorioSensoresPorMaquina {
  listarPorMaquina(machineId: string): Promise<SensorInfo[]>;
}
