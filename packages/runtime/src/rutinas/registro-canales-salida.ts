import type { CanalSalida, CanalSalidaEnviador, ParametrosEnvioCanal } from "@forja/core";

/**
 * Registry (patrón Registry) de enviadores de canal (Strategy): agregar un
 * canal nuevo es registrar un CanalSalidaEnviador más, sin tocar
 * ejecutarRutina ni el scheduler.
 */
export class RegistroCanalesSalida {
  private readonly enviadores = new Map<CanalSalida["tipo"], CanalSalidaEnviador>();

  registrar(tipo: CanalSalida["tipo"], enviador: CanalSalidaEnviador): void {
    this.enviadores.set(tipo, enviador);
  }

  async enviar(params: ParametrosEnvioCanal): Promise<void> {
    const enviador = this.enviadores.get(params.canal.tipo);
    if (!enviador) {
      throw new Error(`No hay un enviador registrado para el canal "${params.canal.tipo}".`);
    }
    await enviador.enviar(params);
  }
}
