import { crearCliente, databaseUrl } from "@forja/db";
import { buildApp } from "./app";
import { construirComposicionAuth } from "./auth/composicion";
import { iniciarPgBoss } from "./pgboss";
import { construirComposicionRuntime } from "./runtime/composicion";
import { registrarWorkerIndexarDocumento } from "./runtime/worker-indexar-documento";
import { registrarWorkerSnapshotFalla } from "./runtime/worker-snapshot-falla";

const PUERTO = Number(process.env["PORT"] ?? 3000);
const WORKSPACE_DIR = process.env["WORKSPACE_DIR"] ?? "./workspace";
const DOCUMENTS_DIR = process.env["DOCUMENTS_DIR"] ?? "./data/documentos";

async function main(): Promise<void> {
  const url = databaseUrl();
  const boss = await iniciarPgBoss(url);
  const { db, cerrar: cerrarDb } = crearCliente(url);
  const auth = construirComposicionAuth(db);
  const runtime = await construirComposicionRuntime(db, WORKSPACE_DIR, DOCUMENTS_DIR, boss);
  await registrarWorkerSnapshotFalla(boss, {
    sensores: runtime.sensoresPorMaquina,
    lecturas: runtime.lecturasVentana,
    snapshots: runtime.snapshotsFalla,
    generarId: runtime.generarId,
    horasVentana: runtime.horasVentanaSnapshot,
  });
  await registrarWorkerIndexarDocumento(boss, {
    documentos: runtime.documentos,
    almacen: runtime.almacen,
    extractor: runtime.extractor,
    selectorEstrategia: runtime.selectorEstrategia,
    embeddings: runtime.embeddings,
    chunks: runtime.chunks,
    generarId: runtime.generarId,
  });
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
