import type { Maquina } from "../entities/maquina";

export interface RepositorioMaquinas {
  buscarPorId(id: string): Promise<Maquina | null>;
  listarPorArea(areaId: string): Promise<Maquina[]>;
}
