export interface RepositorioAreasUsuario {
  areasDe(usuarioId: string): Promise<string[]>;
}
