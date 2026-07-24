import type {
  LecturaCuarentena,
  LecturaIngerida,
  RepositorioCuarentena,
  RepositorioEstadoIngesta,
  RepositorioLecturas,
} from "@forja/core";
import type { BufferCircular } from "./buffer-circular";

export interface DependenciasFlusher {
  readonly lecturas: RepositorioLecturas;
  readonly cuarentena: RepositorioCuarentena;
  readonly estadoIngesta: RepositorioEstadoIngesta;
}

export interface BuffersFlusher {
  readonly lecturas: BufferCircular<LecturaIngerida>;
  readonly cuarentena: BufferCircular<LecturaCuarentena>;
}

/**
 * Vuelca los buffers en memoria a la DB en lotes de `flushMaxLecturas`.
 * Si una escritura falla (DB caída), el lote se reinserta al frente del
 * buffer y el error se propaga: nada se pierde, y quien orquesta el ciclo
 * (programador-flush) decide el backoff del reintento.
 */
export class Flusher {
  private enVuelo = false;

  constructor(
    private readonly repos: DependenciasFlusher,
    private readonly buffers: BuffersFlusher,
    private readonly config: { flushMaxLecturas: number },
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  async flush(): Promise<void> {
    if (this.enVuelo) return;
    this.enVuelo = true;
    try {
      const masAntigua = this.buffers.lecturas.primero();
      const lagMs = masAntigua ? Math.max(0, this.ahora().getTime() - masAntigua.ts.getTime()) : 0;

      await this.drenar(this.buffers.lecturas, (lote) => this.repos.lecturas.insertarLote(lote));
      await this.drenar(this.buffers.cuarentena, async (lote) => {
        for (const item of lote) {
          await this.repos.cuarentena.crear(item);
        }
      });

      await this.repos.estadoIngesta.actualizar({
        lagMs,
        bufferSize: this.buffers.lecturas.tamano + this.buffers.cuarentena.tamano,
        actualizadoEn: this.ahora(),
      });
    } finally {
      this.enVuelo = false;
    }
  }

  private async drenar<T>(buffer: BufferCircular<T>, insertar: (lote: readonly T[]) => Promise<void>): Promise<void> {
    while (buffer.tamano > 0) {
      const lote = buffer.extraerHasta(this.config.flushMaxLecturas);
      try {
        await insertar(lote);
      } catch (error) {
        buffer.devolverAlFrente(lote);
        throw error;
      }
    }
  }
}
