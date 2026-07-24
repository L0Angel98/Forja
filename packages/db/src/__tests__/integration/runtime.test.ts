import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { RegistradorAuditoriaDrizzle } from "../../repositories/registrador-auditoria-drizzle";
import { RegistradorTraceDrizzle } from "../../repositories/registrador-trace-drizzle";
import { RepositorioSugerenciasMemoriaDrizzle } from "../../repositories/repositorio-sugerencias-memoria-drizzle";
import { agentTrace, auditLog, plant } from "../../schema/index";

describe("workspace/runtime (Postgres real)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrar: (() => Promise<void>) | undefined;
  let plantId: string;

  beforeAll(async () => {
    contenedor = await new PostgreSqlContainer("timescale/timescaledb-ha:pg16")
      .withDatabase("forja")
      .withUsername("forja")
      .withPassword("forja")
      .start();

    const cliente = crearCliente(contenedor.getConnectionUri());
    db = cliente.db;
    cerrar = cliente.cerrar;

    await ejecutarMigraciones(contenedor.getConnectionUri());

    const [p] = await db.insert(plant).values({ nombre: "Planta Runtime Test" }).returning();
    plantId = p!.id;
  }, 120_000);

  afterAll(async () => {
    await cerrar?.();
    await contenedor?.stop();
  });

  it("RepositorioSugerenciasMemoriaDrizzle: crea, lista pendientes y actualiza estado", async () => {
    const repo = new RepositorioSugerenciasMemoriaDrizzle(db);
    const sugerencia = { id: randomUUID(), contenido: "dato útil", estado: "pendiente" as const, propuestaEn: new Date() };

    await repo.crear(sugerencia);
    expect(await repo.buscarPorId(sugerencia.id)).toEqual(sugerencia);
    expect((await repo.listarPendientes()).map((s) => s.id)).toContain(sugerencia.id);

    await repo.actualizarEstado(sugerencia.id, "aprobada");
    const actualizada = await repo.buscarPorId(sugerencia.id);
    expect(actualizada?.estado).toBe("aprobada");
    expect((await repo.listarPendientes()).map((s) => s.id)).not.toContain(sugerencia.id);
  });

  it("RegistradorTraceDrizzle: persiste el turno completo en agent_trace", async () => {
    const registrador = new RegistradorTraceDrizzle(db);

    await registrador.registrarTurno({
      plantId,
      usuarioId: null,
      origen: "chat",
      herramientasInvocadas: [{ nombre: "eco", parametros: { texto: "hola" }, exitosa: true }],
      tokensEntrada: 10,
      tokensSalida: 5,
      costoUsd: 0.002,
      latenciaMs: 123,
      exitoso: true,
    });

    const [fila] = await db.select().from(agentTrace).where(eq(agentTrace.plantId, plantId));
    expect(fila).toBeDefined();
    expect(fila?.herramientasInvocadas).toEqual([{ nombre: "eco", parametros: { texto: "hola" }, exitosa: true }]);
    expect(fila?.exitoso).toBe(true);
  });

  it("RegistradorAuditoriaDrizzle: persiste el campo detalle como jsonb", async () => {
    const auditoria = new RegistradorAuditoriaDrizzle(db);

    await auditoria.registrar({
      tipo: "workspace_editado",
      ip: "10.0.0.9",
      ocurridoEn: new Date(),
      detalle: { archivo: "soul", diff: "-a\n+b" },
    });

    const [fila] = await db.select().from(auditLog).where(eq(auditLog.tipo, "workspace_editado"));
    expect(fila?.detalle).toEqual({ archivo: "soul", diff: "-a\n+b" });
  });
});
