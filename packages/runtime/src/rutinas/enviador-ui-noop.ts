import type { CanalSalidaEnviador } from "@forja/core";

/**
 * El canal "ui" no envía nada activamente: la ejecución ya queda en
 * RepositorioEjecucionesRutina, que es lo que expone la bandeja de
 * resultados de la PWA. Este enviador solo cierra el patrón Strategy con
 * una implementación explícita en vez de omitir el canal por completo.
 */
export class EnviadorUiNoOp implements CanalSalidaEnviador {
  async enviar(): Promise<void> {
    // no-op a propósito
  }
}
