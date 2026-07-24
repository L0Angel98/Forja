import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { crearCliente } from "./client";
import { databaseUrl } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "..", "drizzle");

export async function ejecutarMigraciones(connectionString = databaseUrl()): Promise<void> {
  const { db, cerrar } = crearCliente(connectionString);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await cerrar();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarMigraciones()
    .then(() => {
      console.log("Migraciones aplicadas.");
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Error al migrar:", error);
      process.exit(1);
    });
}
