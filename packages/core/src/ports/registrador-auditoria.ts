export const TIPOS_EVENTO_AUDITORIA = [
  "login_exitoso",
  "login_fallido",
  "login_usuario_desactivado",
  "login_demasiados_intentos",
  "logout",
  "workspace_editado",
  "memoria_aprobada",
  "memoria_rechazada",
] as const;

export type TipoEventoAuditoria = (typeof TIPOS_EVENTO_AUDITORIA)[number];

export interface EventoAuditoria {
  readonly tipo: TipoEventoAuditoria;
  readonly ip: string;
  readonly email?: string;
  readonly usuarioId?: string;
  readonly ocurridoEn: Date;
  readonly detalle?: unknown;
}

export interface RegistradorAuditoria {
  registrar(evento: EventoAuditoria): Promise<void>;
}
