import type { EstadoFalla } from "./entities/falla";

const TRANSICIONES_VALIDAS: Record<EstadoFalla, readonly EstadoFalla[]> = {
  abierto: ["en_revision"],
  en_revision: ["atendido"],
  atendido: ["cerrado"],
  cerrado: [],
};

export function transicionValida(actual: EstadoFalla, siguiente: EstadoFalla): boolean {
  return TRANSICIONES_VALIDAS[actual].includes(siguiente);
}
