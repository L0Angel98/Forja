import { eq } from "drizzle-orm";
import type { Maquina, RepositorioMaquinas } from "@forja/core";
import type { ForjaDb } from "../client";
import { machine } from "../schema/machine";

export class RepositorioMaquinasDrizzle implements RepositorioMaquinas {
  constructor(private readonly db: ForjaDb) {}

  async buscarPorId(id: string): Promise<Maquina | null> {
    const [fila] = await this.db.select().from(machine).where(eq(machine.id, id)).limit(1);
    return fila ? mapear(fila) : null;
  }

  async listarPorArea(areaId: string): Promise<Maquina[]> {
    const filas = await this.db.select().from(machine).where(eq(machine.areaId, areaId));
    return filas.map(mapear);
  }
}

function mapear(fila: typeof machine.$inferSelect): Maquina {
  return { id: fila.id, areaId: fila.areaId, nombre: fila.nombre };
}
