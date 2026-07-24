import type { Usuario } from "../entities/usuario";

export interface RepositorioUsuarios {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
}
