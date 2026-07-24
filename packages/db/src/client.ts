import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type ForjaDb = ReturnType<typeof drizzle<typeof schema>>;

export function crearCliente(connectionString: string): { db: ForjaDb; cerrar: () => Promise<void> } {
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return { db, cerrar: () => client.end() };
}
