/**
 * Buffer acotado en memoria: si se llena, descarta lo más antiguo (drop-oldest)
 * en vez de bloquear la ingesta o crecer sin límite.
 */
export class BufferCircular<T> {
  private items: T[] = [];

  constructor(private readonly capacidad: number) {}

  agregar(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacidad) {
      this.items.shift();
    }
  }

  extraerHasta(maximo: number): T[] {
    return this.items.splice(0, maximo);
  }

  /** Reinserta al frente un lote que no pudo persistirse (p. ej. la DB cayó a mitad de un flush). */
  devolverAlFrente(lote: readonly T[]): void {
    this.items.unshift(...lote);
  }

  primero(): T | undefined {
    return this.items[0];
  }

  get tamano(): number {
    return this.items.length;
  }
}
