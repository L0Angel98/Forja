import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EjecucionRutina } from "@forja/core";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { RepositorioEjecucionesRutinaDrizzle } from "../../repositories/repositorio-ejecuciones-rutina-drizzle";
import { plant } from "../../schema/index";

describe("historial de ejecuciones de rutinas (Postgres real)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrarConexion: (() => Promise<void>) | undefined;
  let plantaId: string;

  beforeAll(async () => {
    contenedor = await new PostgreSqlContainer("timescale/timescaledb-ha:pg16")
      .withDatabase("forja")
      .withUsername("forja")
      .withPassword("forja")
      .start();

    const cliente = crearCliente(contenedor.getConnectionUri());
    db = cliente.db;
    cerrarConexion = cliente.cerrar;

    await ejecutarMigraciones(contenedor.getConnectionUri());

    const [planta] = await db.insert(plant).values({ nombre: "Planta Rutinas Test" }).returning();
    plantaId = planta!.id;
  }, 120_000);

  afterAll(async () => {
    await cerrarConexion?.();
    await contenedor?.stop();
  });

  function construirEjecucion(overrides: Partial<EjecucionRutina> = {}): EjecucionRutina {
    return {
      id: randomUUID(),
      rutinaNombre: "resumen-diario",
      plantId: plantaId,
      iniciadaEn: new Date("2026-01-15T06:00:00.000Z"),
      finalizadaEn: new Date("2026-01-15T06:00:05.000Z"),
      estado: "exitosa",
      tokensUsados: 150,
      costoUsd: 0.01,
      salida: "3 fallas en el área de ensamble.",
      error: null,
      ...overrides,
    };
  }

  it("crea y lista ejecuciones por rutina, más recientes primero", async () => {
    const repo = new RepositorioEjecucionesRutinaDrizzle(db);
    const primera = construirEjecucion({ iniciadaEn: new Date("2026-01-14T06:00:00.000Z") });
    const segunda = construirEjecucion({ iniciadaEn: new Date("2026-01-15T06:00:00.000Z") });
    const otraRutina = construirEjecucion({ rutinaNombre: "otra-rutina" });

    await repo.crear(primera);
    await repo.crear(segunda);
    await repo.crear(otraRutina);

    const historial = await repo.listarPorRutina("resumen-diario", 10);
    expect(historial.map((e) => e.id)).toEqual([segunda.id, primera.id]);
    expect(historial[0]).toEqual(segunda);
  });

  it("listarPorRutina respeta el límite", async () => {
    const repo = new RepositorioEjecucionesRutinaDrizzle(db);
    for (let i = 0; i < 3; i++) {
      await repo.crear(construirEjecucion({ rutinaNombre: "rutina-con-limite", iniciadaEn: new Date(2026, 1, 1 + i) }));
    }

    const historial = await repo.listarPorRutina("rutina-con-limite", 2);
    expect(historial).toHaveLength(2);
  });

  it("hayEnCurso es true solo si existe una ejecución sin finalizadaEn", async () => {
    const repo = new RepositorioEjecucionesRutinaDrizzle(db);
    expect(await repo.hayEnCurso("rutina-en-curso")).toBe(false);

    await repo.crear(construirEjecucion({ rutinaNombre: "rutina-en-curso", finalizadaEn: null }));
    expect(await repo.hayEnCurso("rutina-en-curso")).toBe(true);

    await repo.crear(
      construirEjecucion({ rutinaNombre: "rutina-terminada", finalizadaEn: new Date("2026-01-15T06:01:00.000Z") }),
    );
    expect(await repo.hayEnCurso("rutina-terminada")).toBe(false);
  });

  it("tokensUsadosDesde suma solo las ejecuciones de esa planta dentro de la ventana", async () => {
    // Usa una planta propia (no la `plantaId` compartida por el resto del describe)
    // para no sumar tokens de ejecuciones insertadas por otros tests de este archivo.
    const repo = new RepositorioEjecucionesRutinaDrizzle(db);
    const [plantaPropia] = await db.insert(plant).values({ nombre: "Planta Presupuesto Test" }).returning();
    const idPlantaPropia = plantaPropia!.id;

    await repo.crear(
      construirEjecucion({
        plantId: idPlantaPropia,
        rutinaNombre: "presupuesto-a",
        iniciadaEn: new Date("2026-03-01T00:00:00.000Z"),
        tokensUsados: 100,
      }),
    );
    await repo.crear(
      construirEjecucion({
        plantId: idPlantaPropia,
        rutinaNombre: "presupuesto-b",
        iniciadaEn: new Date("2026-03-05T00:00:00.000Z"),
        tokensUsados: 200,
      }),
    );
    await repo.crear(
      construirEjecucion({
        plantId: idPlantaPropia,
        rutinaNombre: "presupuesto-vieja",
        iniciadaEn: new Date("2026-01-01T00:00:00.000Z"),
        tokensUsados: 9999,
      }),
    );
    await repo.crear(
      construirEjecucion({
        rutinaNombre: "presupuesto-otra-planta",
        plantId: plantaId,
        iniciadaEn: new Date("2026-03-02T00:00:00.000Z"),
        tokensUsados: 5000,
      }),
    );

    const total = await repo.tokensUsadosDesde(idPlantaPropia, new Date("2026-02-01T00:00:00.000Z"));
    expect(total).toBe(300);
  });

  it("persiste ejecuciones omitidas/pausadas/excedidas sin salida ni error", async () => {
    const repo = new RepositorioEjecucionesRutinaDrizzle(db);
    const omitida = construirEjecucion({
      rutinaNombre: "rutina-omitida",
      estado: "omitida",
      tokensUsados: 0,
      costoUsd: 0,
      salida: null,
      error: null,
    });

    await repo.crear(omitida);

    const [guardada] = await repo.listarPorRutina("rutina-omitida", 1);
    expect(guardada).toEqual(omitida);
  });
});
