import type { Documento, EstadoIndexacion } from "../entities/documento";

export interface FiltrosListarDocumentos {
  readonly maquinaId?: string;
  readonly areaId?: string;
  readonly soloVigentes?: boolean;
}

export interface RepositorioDocumentos {
  crear(documento: Documento): Promise<void>;
  buscarPorId(id: string): Promise<Documento | null>;
  listar(filtros: FiltrosListarDocumentos): Promise<Documento[]>;
  actualizarVigencia(id: string, vigente: boolean): Promise<void>;
  actualizarEstadoIndexacion(id: string, estado: EstadoIndexacion): Promise<void>;
}
