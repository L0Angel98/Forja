import type { TipoArchivoDocumento } from "../entities/documento";
import type { EstrategiaChunking } from "./estrategia-chunking";

/** Registry+Factory: elige la EstrategiaChunking (Strategy) según el tipo de documento. */
export interface SelectorEstrategiaChunking {
  seleccionar(tipoArchivo: TipoArchivoDocumento): EstrategiaChunking;
}
