/** CRUD de archivos workspace/rutinas/{nombre}.md — el archivo es la fuente de verdad (spec 16). */
export interface EscritorArchivosRutinas {
  listar(): Promise<string[]>;
  leer(nombre: string): Promise<string | null>;
  escribir(nombre: string, contenido: string): Promise<void>;
  eliminar(nombre: string): Promise<void>;
}
