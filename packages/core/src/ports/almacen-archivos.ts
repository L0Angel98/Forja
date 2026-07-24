/** Adapter: guarda y lee el binario original de un documento. */
export interface AlmacenArchivos {
  guardar(nombreSugerido: string, contenido: Buffer): Promise<string>;
  leer(ruta: string): Promise<Buffer>;
}
