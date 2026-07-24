/**
 * Puerto mínimo que necesita parsearRutina para validar la lista de
 * herramientas del frontmatter, sin que core dependa del RegistroHerramientas
 * concreto (vive en runtime).
 */
export interface CatalogoHerramientas {
  existe(nombre: string): boolean;
  esSoloLectura(nombre: string): boolean;
}
