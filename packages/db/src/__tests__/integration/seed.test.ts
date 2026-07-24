import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { seed } from "../../seed";
import { appUser, area, machine, plant, sensor, userArea } from "../../schema/index";

describe("seed de desarrollo", () => {
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

  it("crea 1 planta, 2 áreas, 5 máquinas y 10 sensores; correrlo dos veces no duplica", async () => {
    await seed(db);
    await seed(db);

    const [plantas, areas, maquinas, sensores] = await Promise.all([
      db.select().from(plant),
      db.select().from(area),
      db.select().from(machine),
      db.select().from(sensor),
    ]);

    expect(plantas).toHaveLength(1);
    expect(areas).toHaveLength(2);
    expect(maquinas).toHaveLength(5);
    expect(sensores).toHaveLength(10);

    const [operadorDemo] = await db.select().from(appUser).where(eq(appUser.email, "operador@forja.local")).limit(1);
    const asignaciones = await db.select().from(userArea).where(eq(userArea.userId, operadorDemo!.id));
    expect(asignaciones).toHaveLength(1);
  }, 60_000);

  it("responde una agregación de 7 días para un sensor en menos de 200ms", async () => {
    const [unSensor] = await db.select().from(sensor).limit(1);
    expect(unSensor).toBeDefined();

    const inicio = performance.now();
    await db.execute(
      sql`select min(value), max(value), avg(value) from reading where sensor_id = ${unSensor!.id} and ts > now() - interval '7 days'`,
    );
    const duracionMs = performance.now() - inicio;

    expect(duracionMs).toBeLessThan(200);
  });
});
