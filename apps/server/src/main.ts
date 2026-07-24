import { databaseUrl } from "@forja/db";
import { buildApp } from "./app";
import { iniciarPgBoss } from "./pgboss";

const PUERTO = Number(process.env["PORT"] ?? 3000);

async function main(): Promise<void> {
  const url = databaseUrl();
  const boss = await iniciarPgBoss(url);
  const app = buildApp();

  const cerrar = async () => {
    await app.close();
    await boss.stop();
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
