import { eq } from "drizzle-orm";
import type { RepositorioSesiones, Sesion } from "@forja/core";
import type { ForjaDb } from "../client";
import { session } from "../schema/session";

export class RepositorioSesionesDrizzle implements RepositorioSesiones {
  constructor(private readonly db: ForjaDb) {}

  async crear(sesion: Sesion): Promise<void> {
    await this.db.insert(session).values({
      id: sesion.id,
      userId: sesion.usuarioId,
      dispositivoCompartido: sesion.dispositivoCompartido,
      creadaEn: sesion.creadaEn,
      ultimaActividadEn: sesion.ultimaActividadEn,
    });
  }

  async buscarPorId(id: string): Promise<Sesion | null> {
    const [fila] = await this.db.select().from(session).where(eq(session.id, id)).limit(1);
    if (!fila) return null;
    return {
      id: fila.id,
      usuarioId: fila.userId,
      dispositivoCompartido: fila.dispositivoCompartido,
      creadaEn: fila.creadaEn,
      ultimaActividadEn: fila.ultimaActividadEn,
    };
  }

  async actualizarUltimaActividad(id: string, fecha: Date): Promise<void> {
    await this.db.update(session).set({ ultimaActividadEn: fecha }).where(eq(session.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await this.db.delete(session).where(eq(session.id, id));
  }
}
