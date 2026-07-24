import type { ChunkTroceado } from "../entities/chunk-documento";

/** Patrón Strategy: cada tipo de documento elige cómo trocearse. */
export interface EstrategiaChunking {
  readonly nombre: string;
  trocear(texto: string): ChunkTroceado[];
}
