import { eq } from "drizzle-orm";
import type { RepositorioAreasUsuario } from "@forja/core";
import type { ForjaDb } from "../client";
import { userArea } from "../schema/user-area";

export class RepositorioAreasUsuarioDrizzle implements RepositorioAreasUsuario {
  constructor(private readonly db: ForjaDb) {}

  async areasDe(usuarioId: string): Promise<string[]> {
    const filas = await this.db.select().from(userArea).where(eq(userArea.userId, usuarioId));
    return filas.map((fila) => fila.areaId);
  }
}
