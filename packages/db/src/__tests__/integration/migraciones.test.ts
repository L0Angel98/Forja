import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { plant, sensor, area, machine, reading } from "../../schema/index";

describe("migraciones (Postgres limpio)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrar: (() => Promise<void>) | undefined;

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
  }, 120_000);

  afterAll(async () => {
    await cerrar?.();
    await contenedor?.stop();
  });

  it("corren desde cero sin error y crean las tablas esperadas", async () => {
    const tablas = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    const nombres = tablas.map((fila) => fila.table_name);

    expect(nombres).toEqual(
      expect.arrayContaining([
        "plant",
        "area",
        "machine",
        "machine_family",
        "sensor",
        "reading",
        "role",
        "app_user",
        "agent_trace",
      ]),
    );
  });

  it("convierte reading en hypertable de Timescale", async () => {
    const filas = await db.execute<{ hypertable_name: string }>(
      sql`select hypertable_name from timescaledb_information.hypertables`,
    );
    expect(filas.map((f) => f.hypertable_name)).toContain("reading");
  });

  it("rechaza una máquina sin área y un sensor sin máquina (FK estrictas)", async () => {
    await expect(
      db.insert(machine).values({ areaId: crypto.randomUUID(), nombre: "Fantasma" }),
    ).rejects.toThrow();

    await expect(
      db.insert(sensor).values({
        machineId: crypto.randomUUID(),
        externalId: "fantasma-1",
        nombre: "Sensor fantasma",
        unidad: "°C",
        rangoMin: 0,
        rangoMax: 1,
      }),
    ).rejects.toThrow();
  });

  it("acepta 10k inserts de reading por lote y consulta agregada por rango", async () => {
    const [p] = await db.insert(plant).values({ nombre: "Planta Test" }).returning();
    const [a] = await db.insert(area).values({ plantId: p!.id, nombre: "Área Test" }).returning();
    const [m] = await db.insert(machine).values({ areaId: a!.id, nombre: "Máquina Test" }).returning();
    const [s] = await db
      .insert(sensor)
      .values({
        machineId: m!.id,
        externalId: "sensor-lote-test",
        nombre: "Sensor Test",
        unidad: "°C",
        rangoMin: 0,
        rangoMax: 100,
      })
      .returning();

    const ahora = Date.now();
    const lote = Array.from({ length: 10_000 }, (_, i) => ({
      sensorId: s!.id,
      ts: new Date(ahora - i * 1000),
      value: 20 + Math.sin(i / 100) * 5,
    }));

    await db.insert(reading).values(lote);

    const filas = await db.execute<{ total: string; promedio: string }>(
      sql`select count(*)::text as total, avg(value)::text as promedio from reading where sensor_id = ${s!.id}`,
    );
    const resultado = filas[0];
    expect(resultado).toBeDefined();

    expect(Number(resultado!.total)).toBe(10_000);
    expect(Number(resultado!.promedio)).toBeGreaterThan(0);
  });
});
