import { crearCliente, schema } from "@forja/db";
import { eq } from "drizzle-orm";

/**
 * No existe catálogo de máquinas por HTTP hoy (ver README), así que el
 * único id de máquina real y estable para un test E2E es leerlo
 * directamente de la Postgres sembrada — igual que packages/db/src/seed.ts.
 * Ensamble es el área asignada al operador de desarrollo en el seed.
 */
export async function obtenerMaquinaDeEnsamble(): Promise<{ id: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL no está configurada para el test E2E.");

  const { db, cerrar } = crearCliente(databaseUrl);
  try {
    const [maquina] = await db
      .select({ id: schema.machine.id })
      .from(schema.machine)
      .innerJoin(schema.area, eq(schema.machine.areaId, schema.area.id))
      .where(eq(schema.area.nombre, "Ensamble"))
      .limit(1);

    if (!maquina) throw new Error("No hay máquinas sembradas en el área Ensamble — revisa packages/db/src/seed.ts.");
    return maquina;
  } finally {
    await cerrar();
  }
}
