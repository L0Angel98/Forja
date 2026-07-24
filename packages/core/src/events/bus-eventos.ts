export type ManejadorEvento<T> = (evento: T) => void | Promise<void>;

/**
 * Bus de eventos de dominio in-process, síncrono (Observer). Un caso de uso
 * publica un evento y termina; los manejadores reaccionan (notificar,
 * encolar trabajos, etc.) sin que el caso de uso los conozca.
 */
export class BusEventos {
  private readonly manejadores = new Map<string, ManejadorEvento<unknown>[]>();

  suscribir<T>(tipo: string, manejador: ManejadorEvento<T>): void {
    const lista = this.manejadores.get(tipo) ?? [];
    lista.push(manejador as ManejadorEvento<unknown>);
    this.manejadores.set(tipo, lista);
  }

  async publicar<T>(tipo: string, evento: T): Promise<void> {
    const lista = this.manejadores.get(tipo) ?? [];
    for (const manejador of lista) {
      await manejador(evento);
    }
  }
}
