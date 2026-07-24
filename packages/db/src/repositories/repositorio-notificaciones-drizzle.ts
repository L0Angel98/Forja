import { eq } from "drizzle-orm";
import type { Notificacion, RepositorioNotificaciones } from "@forja/core";
import type { ForjaDb } from "../client";
import { notification } from "../schema/notification";

export class RepositorioNotificacionesDrizzle implements RepositorioNotificaciones {
  constructor(private readonly db: ForjaDb) {}

  async crear(notificacion: Notificacion): Promise<void> {
    await this.db.insert(notification).values({
      id: notificacion.id,
      areaId: notificacion.areaId,
      tipo: notificacion.tipo,
      referenciaId: notificacion.referenciaId,
      createdAt: notificacion.creadaEn,
    });
  }

  async listar(areaId?: string): Promise<Notificacion[]> {
    const filas = areaId
      ? await this.db.select().from(notification).where(eq(notification.areaId, areaId))
      : await this.db.select().from(notification);
    return filas.map(mapear);
  }
}

function mapear(fila: typeof notification.$inferSelect): Notificacion {
  return {
    id: fila.id,
    areaId: fila.areaId,
    tipo: fila.tipo,
    referenciaId: fila.referenciaId,
    creadaEn: fila.createdAt,
  };
}
