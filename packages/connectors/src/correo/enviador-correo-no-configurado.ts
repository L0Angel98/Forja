import type { EnviadorCorreo } from "./enviador-correo";

/** Igual patrón que ProveedorLLMNoConfigurado (spec 12): sin SMTP_* en env, enviar falla explícito. */
export class EnviadorCorreoSmtpNoConfigurado implements EnviadorCorreo {
  async enviar(): Promise<void> {
    throw new Error("El correo SMTP no está configurado: faltan SMTP_HOST/SMTP_USER/SMTP_PASSWORD.");
  }
}
