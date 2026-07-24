export interface ParametrosEnviarCorreo {
  readonly destinatarios: readonly string[];
  readonly asunto: string;
  readonly cuerpo: string;
}

/** Puerto hacia el envío real de correo (adaptador en connectors: infraestructura externa). */
export interface EnviadorCorreo {
  enviar(params: ParametrosEnviarCorreo): Promise<void>;
}
