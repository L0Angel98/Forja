import type { EventoAuditoria, RegistradorAuditoria } from "@forja/core";
import type { ForjaDb } from "../client";
import { auditLog } from "../schema/audit-log";

export class RegistradorAuditoriaDrizzle implements RegistradorAuditoria {
  constructor(private readonly db: ForjaDb) {}

  async registrar(evento: EventoAuditoria): Promise<void> {
    await this.db.insert(auditLog).values({
      tipo: evento.tipo,
      ip: evento.ip,
      email: evento.email ?? null,
      userId: evento.usuarioId ?? null,
      ocurridoEn: evento.ocurridoEn,
      detalle: evento.detalle ?? null,
    });
  }
}
