import { ConectorNoDisponible, type ClienteMcp } from "@forja/core";

const TIMEOUT_MS = 10_000;
const UMBRAL_FALLOS_CONSECUTIVOS = 5;
const DURACION_APERTURA_MS = 5 * 60 * 1000;

/**
 * Decorator (patrón Decorator) sobre un ClienteMcp: aplica timeout de 10s
 * a cada operación y un circuit breaker por conector (spec 17): 5 fallos
 * seguidos abren el circuito 5 minutos, tras los cuales se deja pasar un
 * intento (medio-abierto) para comprobar si el conector se recuperó.
 */
export class CircuitBreakerClienteMcp implements ClienteMcp {
  private fallosConsecutivos = 0;
  private abiertoHasta: number | null = null;

  constructor(private readonly nombreConector: string, private readonly interno: ClienteMcp) {}

  async listarHerramientas(): Promise<readonly Record<string, unknown>[]> {
    return this.ejecutar(() => this.interno.listarHerramientas());
  }

  async invocar(nombreHerramienta: string, parametros: Record<string, unknown>): Promise<string> {
    return this.ejecutar(() => this.interno.invocar(nombreHerramienta, parametros));
  }

  async cerrar(): Promise<void> {
    await this.interno.cerrar();
  }

  private async ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    if (this.abiertoHasta !== null) {
      if (Date.now() < this.abiertoHasta) throw new ConectorNoDisponible(this.nombreConector);
      this.abiertoHasta = null;
    }

    try {
      const resultado = await this.conTimeout(operacion());
      this.fallosConsecutivos = 0;
      return resultado;
    } catch (error) {
      this.fallosConsecutivos += 1;
      if (this.fallosConsecutivos >= UMBRAL_FALLOS_CONSECUTIVOS) {
        this.abiertoHasta = Date.now() + DURACION_APERTURA_MS;
      }
      throw error;
    }
  }

  private conTimeout<T>(promesa: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const temporizador = setTimeout(() => {
        reject(new Error(`conector "${this.nombreConector}": tiempo de espera agotado (10s).`));
      }, TIMEOUT_MS);

      promesa.then(
        (valor) => {
          clearTimeout(temporizador);
          resolve(valor);
        },
        (error: unknown) => {
          clearTimeout(temporizador);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }
}
