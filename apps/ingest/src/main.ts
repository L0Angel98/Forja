import { crearCliente, databaseUrl } from "@forja/db";
import { sql } from "drizzle-orm";

async function main(): Promise<void> {
  const { db, cerrar } = crearCliente(databaseUrl());
  await db.execute(sql`select 1`);
  console.log("ingest: conexión a la base de datos verificada, en espera de conectores (spec 15).");

  const detener = async () => {
    await cerrar();
    process.exit(0);
  };
  process.on("SIGTERM", detener);
  process.on("SIGINT", detener);

  await new Promise(() => {
    // Proceso de ingesta de larga duración; los conectores MQTT/OPC UA se
    // registran aquí a partir de la spec 15. Ciclo de vida independiente
    // de `server` a propósito (§3 del plan de infraestructura).
  });
}

main().catch((error: unknown) => {
  console.error("Error en el proceso de ingesta:", error);
  process.exit(1);
});
