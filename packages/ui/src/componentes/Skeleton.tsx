import { combinarClases } from "../utils/combinar-clases";
import estilos from "./Skeleton.module.css";

export type RadioSkeleton = "control" | "tarjeta" | "circulo";

export interface PropiedadesSkeleton {
  readonly ancho?: string;
  readonly alto?: string;
  readonly radio?: RadioSkeleton;
  readonly className?: string;
}

/**
 * Bloque de carga genérico y componible (spec 02-interfaz: "skeleton con la
 * forma del contenido real"). No hay skeletons con nombre por tipo de
 * contenido — cada pantalla compone varios <Skeleton> del tamaño que
 * necesite. La animación respeta prefers-reduced-motion vía la regla global
 * de base.css, no necesita su propia media query.
 */
export function Skeleton({ ancho = "100%", alto = "1rem", radio = "control", className }: PropiedadesSkeleton) {
  return (
    <span
      aria-hidden="true"
      className={combinarClases(estilos.skeleton, estilos[radio], className)}
      style={{ width: ancho, height: alto }}
    />
  );
}
