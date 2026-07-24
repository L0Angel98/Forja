export const TIPOS_EVENTO_AUDITORIA = [
  "login_exitoso",
  "login_fallido",
  "login_usuario_desactivado",
  "login_demasiados_intentos",
  "logout",
] as const;

export type TipoEventoAuditoria = (typeof TIPOS_EVENTO_AUDITORIA)[number];

export interface EventoAuditoria {
  readonly tipo: TipoEventoAuditoria;
  readonly ip: string;
  readonly email?: string;
  readonly usuarioId?: string;
  readonly ocurridoEn: Date;
}

export interface RegistradorAuditoria {
  registrar(evento: EventoAuditoria): Promise<void>;
}
