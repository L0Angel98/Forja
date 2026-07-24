import type { ProveedorLLM } from "@forja/core";

/**
 * ProveedorLLM de reserva cuando no hay credenciales de un proveedor real
 * configuradas. `ejecutarTurno` (@forja/runtime) captura el error y degrada
 * la respuesta con el mensaje "el asistente no está disponible"; el chat
 * nunca queda roto por falta de credenciales, y el formulario manual sigue
 * disponible como camino alterno.
 */
export class ProveedorLLMNoConfigurado implements ProveedorLLM {
  async decidir(): Promise<never> {
    throw new Error("No hay un proveedor LLM configurado en este despliegue.");
  }
}
