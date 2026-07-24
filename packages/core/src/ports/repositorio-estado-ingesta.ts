import type { EstadoIngesta } from "../entities/estado-ingesta";

export interface RepositorioEstadoIngesta {
  actualizar(estado: EstadoIngesta): Promise<void>;
  obtener(): Promise<EstadoIngesta | null>;
}
