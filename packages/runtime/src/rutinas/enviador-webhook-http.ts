import type { CanalSalidaEnviador, ParametrosEnvioCanal } from "@forja/core";

/** Strategy: POST simple con el resultado de la rutina. Sin credenciales: la URL es toda la configuración que necesita. */
export class EnviadorWebhookHttp implements CanalSalidaEnviador {
  async enviar(params: ParametrosEnvioCanal): Promise<void> {
    if (params.canal.tipo !== "webhook") {
      throw new Error("EnviadorWebhookHttp solo puede recibir canales de tipo webhook.");
    }

    const respuesta = await fetch(params.canal.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rutina: params.rutinaNombre,
        ejecucionId: params.ejecucionId,
        resultado: params.resultado,
      }),
    });

    if (!respuesta.ok) {
      throw new Error(`El webhook respondió ${respuesta.status} ${respuesta.statusText}.`);
    }
  }
}
