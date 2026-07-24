import { clasificarLectura, type LecturaCuarentena, type LecturaIngerida } from "@forja/core";
import { BufferCircular } from "./buffer-circular";
import { CacheCatalogoSensores } from "./catalogo-cache";
import { analizarPayload, analizarTopico } from "./mensaje-mqtt";

export interface DependenciasProcesadorMensajes {
  readonly catalogo: CacheCatalogoSensores;
  readonly bufferLecturas: BufferCircular<LecturaIngerida>;
  readonly bufferCuarentena: BufferCircular<LecturaCuarentena>;
  readonly generarId: () => string;
  readonly ahora: () => Date;
}

/**
 * Único punto de entrada del broker hacia el dominio: clasifica cada mensaje
 * MQTT (aceptado o cuarentena) y lo deposita en el buffer correspondiente.
 * No hace I/O — el flush a la DB corre en un ciclo aparte.
 */
export class ProcesadorMensajesMqtt {
  constructor(private readonly deps: DependenciasProcesadorMensajes) {}

  procesar(topico: string, payloadCrudo: string): void {
    const mensaje = analizarTopico(topico);
    if (!mensaje) return;

    const ahora = this.deps.ahora();
    const datos = analizarPayload(payloadCrudo);
    const sensor = this.deps.catalogo.buscarPorExternalId(mensaje.sensorExternalId);

    const resultado = clasificarLectura({
      sensor,
      ts: datos?.ts ?? ahora,
      valorCrudo: datos?.value,
      ahora,
    });

    if (resultado.tipo === "aceptada") {
      this.deps.bufferLecturas.agregar(resultado.lectura);
      return;
    }

    this.deps.bufferCuarentena.agregar({
      id: this.deps.generarId(),
      sensorExternalId: mensaje.sensorExternalId,
      payloadCrudo,
      motivo: resultado.motivo,
      ts: datos?.ts ?? null,
      recibidoEn: ahora,
    });
  }
}
