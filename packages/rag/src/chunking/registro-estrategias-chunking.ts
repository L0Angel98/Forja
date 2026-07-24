import type { EstrategiaChunking, SelectorEstrategiaChunking, TipoArchivoDocumento } from "@forja/core";
import { PorEncabezados } from "./por-encabezados";
import { PorTamanoFijo } from "./por-tamano-fijo";

/**
 * Registry+Factory: MD y DOCX llegan como Markdown (ExtractorTextoForja
 * convierte el HTML de DOCX a Markdown vía turndown), así que ambos usan
 * PorEncabezados. PDF no tiene marcado estructural confiable tras la
 * extracción, así que usa el fallback PorTamañoFijo (que además preserva
 * el número de página).
 */
export class RegistroEstrategiasChunking implements SelectorEstrategiaChunking {
  private readonly porEncabezados = new PorEncabezados();
  private readonly porTamanoFijo = new PorTamanoFijo();

  seleccionar(tipoArchivo: TipoArchivoDocumento): EstrategiaChunking {
    if (tipoArchivo === "pdf") return this.porTamanoFijo;
    return this.porEncabezados;
  }
}
