import type { ChunkTroceado } from "../entities/chunk-documento";
import type { TextoExtraido } from "./extractor-texto";

/** Patrón Strategy: cada tipo de documento elige cómo trocearse. */
export interface EstrategiaChunking {
  readonly nombre: string;
  trocear(textoExtraido: TextoExtraido): ChunkTroceado[];
}
