import { crearCliente, databaseUrl } from "@forja/db";
import { buildApp } from "./app";
import { construirComposicionAuth } from "./auth/composicion";
import { iniciarPgBoss } from "./pgboss";
import { construirComposicionRuntime } from "./runtime/composicion";

const PUERTO = Number(process.env["PORT"] ?? 3000);
const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "./workspace";

async function main(): Promise<void> {
  const url = databaseUrl();
  const boss = await iniciarPgBoss(url);
  const { db, cerrar: cerrarDb } = crearCliente(url);
  const auth = construirComposicionAuth(db);
  const runtime = await construirComposicionRuntime(db, WORKSPACE_DIR);
  const app = buildApp({ auth, runtime });

  const cerrar = async () => {
    runtime.workspaceLoader.detener();
    await app.close();
    await boss.stop();
    await cerrarDb();
    process.exit(0);
  };
  process.on("SIGTERM", cerrar);
  process.on("SIGINT", cerrar);

  await app.listen({ host: "0.0.0.0", port: PUERTO });
}

main().catch((error: unknown) => {
  console.error("Error al iniciar el servidor:", error);
  process.exit(1);
});
