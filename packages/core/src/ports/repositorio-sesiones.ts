import type { Sesion } from "../entities/sesion";

export interface RepositorioSesiones {
  crear(sesion: Sesion): Promise<void>;
  buscarPorId(id: string): Promise<Sesion | null>;
  actualizarUltimaActividad(id: string, fecha: Date): Promise<void>;
  eliminar(id: string): Promise<void>;
}
