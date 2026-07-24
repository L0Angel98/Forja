import { eq } from "drizzle-orm";
import type { RepositorioSensoresPorMaquina, SensorInfo } from "@forja/core";
import type { ForjaDb } from "../client";
import { sensor } from "../schema/sensor";

export class RepositorioSensoresPorMaquinaDrizzle implements RepositorioSensoresPorMaquina {
  constructor(private readonly db: ForjaDb) {}

  async listarPorMaquina(machineId: string): Promise<SensorInfo[]> {
    const filas = await this.db.select().from(sensor).where(eq(sensor.machineId, machineId));
    return filas.map((fila) => ({ id: fila.id, machineId: fila.machineId, nombre: fila.nombre }));
  }
}
