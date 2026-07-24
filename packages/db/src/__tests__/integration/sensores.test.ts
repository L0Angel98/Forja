import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { RepositorioAgregacionesSensoresDrizzle } from "../../repositories/repositorio-agregaciones-sensores-drizzle";
import { RepositorioCatalogoSensoresDrizzle } from "../../repositories/repositorio-catalogo-sensores-drizzle";
import { RepositorioCuarentenaDrizzle } from "../../repositories/repositorio-cuarentena-drizzle";
import { RepositorioEstadoIngestaDrizzle } from "../../repositories/repositorio-estado-ingesta-drizzle";
import { RepositorioLecturasDrizzle } from "../../repositories/repositorio-lecturas-drizzle";
import { area, machine, plant, reading, sensor } from "../../schema/index";

describe("ingesta y consulta de sensores (Postgres real)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrarConexion: (() => Promise<void>) | undefined;

  let maquinaId: string;
  let sensorTempId: string;
  let sensorPresionId: string;

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

    const [planta] = await db.insert(plant).values({ nombre: "Planta Sensores Test" }).returning();
    const [areaFila] = await db.insert(area).values({ plantId: planta!.id, nombre: "Ensamble" }).returning();
    const [maquina] = await db.insert(machine).values({ areaId: areaFila!.id, nombre: "Prensa" }).returning();
    maquinaId = maquina!.id;

    const [sensorTemp] = await db
      .insert(sensor)
      .values({
        machineId: maquinaId,
        externalId: "prensa-temp-1",
        nombre: "Temperatura",
        unidad: "C",
        rangoMin: 0,
        rangoMax: 200,
        mudoTrasMinutos: 30,
      })
      .returning();
    sensorTempId = sensorTemp!.id;

    const [sensorPresion] = await db
      .insert(sensor)
      .values({
        machineId: maquinaId,
        externalId: "prensa-presion-1",
        nombre: "Presión",
        unidad: "bar",
        rangoMin: 0,
        rangoMax: 10,
      })
      .returning();
    sensorPresionId = sensorPresion!.id;
  }, 120_000);

  afterAll(async () => {
    await cerrarConexion?.();
    await contenedor?.stop();
  });

  it("RepositorioCatalogoSensoresDrizzle: listar, buscarPorId, listarPorMaquina", async () => {
    const catalogo = new RepositorioCatalogoSensoresDrizzle(db);

    expect(await catalogo.buscarPorId(sensorTempId)).toEqual({
      id: sensorTempId,
      externalId: "prensa-temp-1",
      machineId: maquinaId,
      nombre: "Temperatura",
      unidad: "C",
      rangoMin: 0,
      rangoMax: 200,
      mudoTrasMinutos: 30,
    });
    expect(await catalogo.buscarPorId(randomUUID())).toBeNull();

    const deLaMaquina = await catalogo.listarPorMaquina(maquinaId);
    expect(deLaMaquina.map((s) => s.id).sort()).toEqual([sensorPresionId, sensorTempId].sort());

    const todos = await catalogo.listar();
    expect(todos.map((s) => s.id)).toEqual(expect.arrayContaining([sensorTempId, sensorPresionId]));
  });

  it("RepositorioLecturasDrizzle: insertarLote, ultimaLecturaEn, ignora duplicados (sensorId, ts)", async () => {
    const lecturas = new RepositorioLecturasDrizzle(db);

    expect(await lecturas.ultimaLecturaEn(sensorPresionId)).toBeNull();

    await lecturas.insertarLote([
      { sensorId: sensorPresionId, ts: new Date("2026-01-01T10:00:00.000Z"), value: 5, fueraDeRango: false },
      { sensorId: sensorPresionId, ts: new Date("2026-01-01T10:05:00.000Z"), value: 6, fueraDeRango: false },
    ]);
    expect(await lecturas.ultimaLecturaEn(sensorPresionId)).toEqual(new Date("2026-01-01T10:05:00.000Z"));

    await lecturas.insertarLote([
      { sensorId: sensorPresionId, ts: new Date("2026-01-01T10:05:00.000Z"), value: 999, fueraDeRango: true },
    ]);
    expect(await lecturas.ultimaLecturaEn(sensorPresionId)).toEqual(new Date("2026-01-01T10:05:00.000Z"));

    const [filaSinSobrescribir] = await db
      .select()
      .from(reading)
      .where(and(eq(reading.sensorId, sensorPresionId), eq(reading.ts, new Date("2026-01-01T10:05:00.000Z"))));
    expect(filaSinSobrescribir?.value).toBe(6);
  });

  it("RepositorioCuarentenaDrizzle: crear y contar", async () => {
    const cuarentena = new RepositorioCuarentenaDrizzle(db);
    const antes = await cuarentena.contar();

    await cuarentena.crear({
      id: randomUUID(),
      sensorExternalId: "sensor-desconocido-x",
      payloadCrudo: '{"v":1}',
      motivo: "sensor_desconocido",
      ts: null,
      recibidoEn: new Date("2026-01-01T10:00:00.000Z"),
    });

    expect(await cuarentena.contar()).toBe(antes + 1);
  });

  it("RepositorioEstadoIngestaDrizzle: actualizar hace upsert sobre la fila singleton", async () => {
    const estadoIngesta = new RepositorioEstadoIngestaDrizzle(db);

    expect(await estadoIngesta.obtener()).toBeNull();

    await estadoIngesta.actualizar({ lagMs: 120, bufferSize: 40, actualizadoEn: new Date("2026-01-01T10:00:00.000Z") });
    expect(await estadoIngesta.obtener()).toEqual({
      lagMs: 120,
      bufferSize: 40,
      actualizadoEn: new Date("2026-01-01T10:00:00.000Z"),
    });

    await estadoIngesta.actualizar({ lagMs: 5, bufferSize: 0, actualizadoEn: new Date("2026-01-01T10:01:00.000Z") });
    expect(await estadoIngesta.obtener()).toEqual({
      lagMs: 5,
      bufferSize: 0,
      actualizadoEn: new Date("2026-01-01T10:01:00.000Z"),
    });
  });

  it("RepositorioAgregacionesSensoresDrizzle: agrega correctamente y re-bucketiza si excede MAXIMO_PUNTOS_SERIE", async () => {
    const lecturas = new RepositorioLecturasDrizzle(db);
    const agregaciones = new RepositorioAgregacionesSensoresDrizzle(db);
    const sensorId = sensorPresionId;

    await lecturas.insertarLote([
      { sensorId, ts: new Date("2026-03-01T10:00:00.000Z"), value: 1, fueraDeRango: false },
      { sensorId, ts: new Date("2026-03-01T10:01:00.000Z"), value: 3, fueraDeRango: false },
      { sensorId, ts: new Date("2026-03-01T10:06:00.000Z"), value: 5, fueraDeRango: false },
    ]);

    const serieMax = await agregaciones.consultar({
      sensorId,
      agregacion: "max",
      bucket: "5m",
      desde: new Date("2026-03-01T09:55:00.000Z"),
      hasta: new Date("2026-03-01T10:10:00.000Z"),
    });
    expect(serieMax.reBucketizado).toBe(false);
    expect(serieMax.bucket).toBe("5m");
    expect(serieMax.puntos).toEqual([
      { bucket: new Date("2026-03-01T10:00:00.000Z"), valor: 3 },
      { bucket: new Date("2026-03-01T10:05:00.000Z"), valor: 5 },
    ]);

    const serieCount = await agregaciones.consultar({
      sensorId,
      agregacion: "count",
      bucket: "5m",
      desde: new Date("2026-03-01T09:55:00.000Z"),
      hasta: new Date("2026-03-01T10:10:00.000Z"),
    });
    expect(serieCount.puntos).toEqual([
      { bucket: new Date("2026-03-01T10:00:00.000Z"), valor: 2 },
      { bucket: new Date("2026-03-01T10:05:00.000Z"), valor: 1 },
    ]);

    const desde = new Date("2026-04-01T00:00:00.000Z");
    const muchasLecturas = Array.from({ length: 600 }, (_, i) => ({
      sensorId,
      ts: new Date(desde.getTime() + i * 5 * 60_000),
      value: i,
      fueraDeRango: false,
    }));
    await lecturas.insertarLote(muchasLecturas);

    const hasta = new Date(desde.getTime() + 600 * 5 * 60_000);
    const serieEscalada = await agregaciones.consultar({
      sensorId,
      agregacion: "avg",
      bucket: "5m",
      desde,
      hasta,
    });
    expect(serieEscalada.reBucketizado).toBe(true);
    expect(serieEscalada.bucket).toBe("1h");
    expect(serieEscalada.puntos.length).toBeLessThanOrEqual(500);
    expect(serieEscalada.puntos.length).toBeGreaterThan(0);
  }, 60_000);
});
