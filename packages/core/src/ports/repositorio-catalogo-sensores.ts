import type { SensorCatalogo } from "../entities/sensor-catalogo";

export interface RepositorioCatalogoSensores {
  listar(): Promise<SensorCatalogo[]>;
  buscarPorId(id: string): Promise<SensorCatalogo | null>;
  listarPorMaquina(machineId: string): Promise<SensorCatalogo[]>;
}
