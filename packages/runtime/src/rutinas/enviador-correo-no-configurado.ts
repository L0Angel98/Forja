import type { CanalSalidaEnviador } from "@forja/core";

/**
 * No hay ningún proveedor de correo real en este despliegue (sin SMTP/API
 * de email configurados en el proyecto). Mismo patrón que
 * ProveedorLLMNoConfigurado (apps/server): lanza, y quien orquesta
 * (ejecutarRutina) decide cómo degradar en vez de fallar en silencio.
 */
export class EnviadorCorreoNoConfigurado implements CanalSalidaEnviador {
  async enviar(): Promise<never> {
    throw new Error("No hay un proveedor de correo configurado en este despliegue.");
  }
}
