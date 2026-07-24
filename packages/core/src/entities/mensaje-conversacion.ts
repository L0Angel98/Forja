export type RolMensaje = "usuario" | "agente" | "herramienta";

export interface MensajeConversacion {
  readonly rol: RolMensaje;
  readonly contenido: string;
  readonly nombreHerramienta?: string;
}
