import { eq } from "drizzle-orm";
import type { RepositorioCatalogoSensores, SensorCatalogo } from "@forja/core";
import type { ForjaDb } from "../client";
import { sensor } from "../schema/sensor";

export class RepositorioCatalogoSensoresDrizzle implements RepositorioCatalogoSensores {
  constructor(private readonly db: ForjaDb) {}

  async listar(): Promise<SensorCatalogo[]> {
    const filas = await this.db.select().from(sensor);
    return filas.map(mapear);
  }

  async buscarPorId(id: string): Promise<SensorCatalogo | null> {
    const [fila] = await this.db.select().from(sensor).where(eq(sensor.id, id)).limit(1);
    return fila ? mapear(fila) : null;
  }

  async listarPorMaquina(machineId: string): Promise<SensorCatalogo[]> {
    const filas = await this.db.select().from(sensor).where(eq(sensor.machineId, machineId));
    return filas.map(mapear);
  }
}

function mapear(fila: typeof sensor.$inferSelect): SensorCatalogo {
  return {
    id: fila.id,
    externalId: fila.externalId,
    machineId: fila.machineId,
    nombre: fila.nombre,
    unidad: fila.unidad,
    rangoMin: fila.rangoMin,
    rangoMax: fila.rangoMax,
    mudoTrasMinutos: fila.mudoTrasMinutos,
  };
}
