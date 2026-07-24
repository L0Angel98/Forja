import type { EstadoFalla, ReporteFalla } from "../entities/falla";

export interface FiltrosListarFallas {
  readonly areaIds?: readonly string[];
  readonly machineId?: string;
  readonly estado?: EstadoFalla;
  readonly severidad?: number;
}

export interface RepositorioFallas {
  crear(reporte: ReporteFalla): Promise<void>;
  buscarPorId(id: string): Promise<ReporteFalla | null>;
  actualizarEstado(id: string, estado: EstadoFalla): Promise<void>;
  listar(filtros: FiltrosListarFallas): Promise<ReporteFalla[]>;
}
