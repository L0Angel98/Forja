import type { EstadoSugerenciaMemoria, SugerenciaMemoria } from "../entities/sugerencia-memoria";

export interface RepositorioSugerenciasMemoria {
  crear(sugerencia: SugerenciaMemoria): Promise<void>;
  buscarPorId(id: string): Promise<SugerenciaMemoria | null>;
  listarPendientes(): Promise<SugerenciaMemoria[]>;
  actualizarEstado(id: string, estado: EstadoSugerenciaMemoria): Promise<void>;
}
