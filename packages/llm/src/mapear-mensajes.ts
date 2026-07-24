import type { MensajeConversacion } from "@forja/core";
import type { CoreMessage } from "ai";

/**
 * `ejecutarTurno` (@forja/runtime) maneja el ciclo de invocación de
 * herramientas fuera del Vercel AI SDK (un `decidir()` = un solo paso), así
 * que los mensajes de rol "herramienta" no siguen el protocolo de tool-call
 * del SDK: se pliegan como una nota de texto para no perder el contexto.
 */
export function mapearMensajes(historial: readonly MensajeConversacion[]): CoreMessage[] {
  return historial.map((mensaje) => {
    if (mensaje.rol === "usuario") {
      return { role: "user", content: mensaje.contenido };
    }
    if (mensaje.rol === "herramienta") {
      return {
        role: "assistant",
        content: `[resultado de "${mensaje.nombreHerramienta ?? "herramienta"}"]: ${mensaje.contenido}`,
      };
    }
    return { role: "assistant", content: mensaje.contenido };
  });
}
