/** Adapter: convierte texto en vectores de embedding. Dimensión fija por instalación. */
export interface GeneradorEmbeddings {
  readonly dimensiones: number;
  generar(textos: readonly string[]): Promise<number[][]>;
}
