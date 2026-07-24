import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BusEventos,
  cambiarEstadoFalla,
  crearReporteFalla,
  materializarSnapshotFalla,
  registrarManejadoresFalla,
  TRABAJO_MATERIALIZAR_SNAPSHOT,
  type ColaTrabajos,
  type Usuario,
} from "@forja/core";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { RepositorioAreasUsuarioDrizzle } from "../../repositories/repositorio-areas-usuario-drizzle";
import { RepositorioFallasDrizzle } from "../../repositories/repositorio-fallas-drizzle";
import { RepositorioLecturasVentanaDrizzle } from "../../repositories/repositorio-lecturas-ventana-drizzle";
import { RepositorioMaquinasDrizzle } from "../../repositories/repositorio-maquinas-drizzle";
import { RepositorioNotificacionesDrizzle } from "../../repositories/repositorio-notificaciones-drizzle";
import { RepositorioSensoresPorMaquinaDrizzle } from "../../repositories/repositorio-sensores-por-maquina-drizzle";
import { RepositorioSnapshotsFallaDrizzle } from "../../repositories/repositorio-snapshots-falla-drizzle";
import { appUser, area, machine, plant, reading, role, sensor, userArea } from "../../schema/index";

describe("reporte de fallas (Postgres real)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrarConexion: (() => Promise<void>) | undefined;

  let areaEnsambleId: string;
  let areaMaquinadoId: string;
  let maquinaPrensaId: string;
  let maquinaTornoId: string;
  let sensorTempId: string;
  let operadorEnsamble: Usuario;
  let supervisor: Usuario;

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

    await db.insert(role).values([{ id: "operador" }, { id: "supervisor" }, { id: "admin" }]);

    const [planta] = await db.insert(plant).values({ nombre: "Planta Fallas Test" }).returning();

    const [ensamble] = await db.insert(area).values({ plantId: planta!.id, nombre: "Ensamble" }).returning();
    const [maquinado] = await db.insert(area).values({ plantId: planta!.id, nombre: "Maquinado" }).returning();
    areaEnsambleId = ensamble!.id;
    areaMaquinadoId = maquinado!.id;

    const [prensa] = await db.insert(machine).values({ areaId: areaEnsambleId, nombre: "Prensa" }).returning();
    const [torno] = await db.insert(machine).values({ areaId: areaMaquinadoId, nombre: "Torno CNC" }).returning();
    maquinaPrensaId = prensa!.id;
    maquinaTornoId = torno!.id;

    const [sensorTemp] = await db
      .insert(sensor)
      .values({
        machineId: maquinaPrensaId,
        externalId: "prensa-temp-1",
        nombre: "Temperatura",
        unidad: "C",
        rangoMin: 0,
        rangoMax: 200,
      })
      .returning();
    sensorTempId = sensorTemp!.id;

    const [filaOperador] = await db
      .insert(appUser)
      .values({
        email: "operador@planta.mx",
        nombre: "Operador",
        roleId: "operador",
        passwordHash: "hash:x",
      })
      .returning();
    const [filaSupervisor] = await db
      .insert(appUser)
      .values({
        email: "supervisor@planta.mx",
        nombre: "Supervisor",
        roleId: "supervisor",
        passwordHash: "hash:x",
      })
      .returning();

    operadorEnsamble = {
      id: filaOperador!.id,
      email: filaOperador!.email,
      passwordHash: filaOperador!.passwordHash,
      nombre: filaOperador!.nombre,
      rol: "operador",
      activo: true,
    };
    supervisor = {
      id: filaSupervisor!.id,
      email: filaSupervisor!.email,
      passwordHash: filaSupervisor!.passwordHash,
      nombre: filaSupervisor!.nombre,
      rol: "supervisor",
      activo: true,
    };

    await db.insert(userArea).values({ userId: operadorEnsamble.id, areaId: areaEnsambleId });
  }, 120_000);

  afterAll(async () => {
    await cerrarConexion?.();
    await contenedor?.stop();
  });

  it("RepositorioMaquinasDrizzle: buscarPorId y listarPorArea", async () => {
    const maquinas = new RepositorioMaquinasDrizzle(db);

    expect(await maquinas.buscarPorId(maquinaPrensaId)).toEqual({
      id: maquinaPrensaId,
      areaId: areaEnsambleId,
      nombre: "Prensa",
    });
    expect(await maquinas.buscarPorId(randomUUID())).toBeNull();

    const deArea = await maquinas.listarPorArea(areaEnsambleId);
    expect(deArea.map((m) => m.id)).toEqual([maquinaPrensaId]);
  });

  it("RepositorioAreasUsuarioDrizzle: areasDe devuelve las áreas asignadas", async () => {
    const areasUsuario = new RepositorioAreasUsuarioDrizzle(db);

    expect(await areasUsuario.areasDe(operadorEnsamble.id)).toEqual([areaEnsambleId]);
    expect(await areasUsuario.areasDe(supervisor.id)).toEqual([]);
  });

  it("RepositorioSensoresPorMaquinaDrizzle: listarPorMaquina", async () => {
    const sensores = new RepositorioSensoresPorMaquinaDrizzle(db);

    const deLaPrensa = await sensores.listarPorMaquina(maquinaPrensaId);
    expect(deLaPrensa.map((s) => s.id)).toEqual([sensorTempId]);
    expect(await sensores.listarPorMaquina(maquinaTornoId)).toEqual([]);
  });

  it("RepositorioLecturasVentanaDrizzle: leerVentana filtra por rango de tiempo", async () => {
    await db.insert(reading).values([
      { sensorId: sensorTempId, ts: new Date("2026-01-01T10:00:00.000Z"), value: 60 },
      { sensorId: sensorTempId, ts: new Date("2026-01-01T11:00:00.000Z"), value: 80 },
      { sensorId: sensorTempId, ts: new Date("2026-01-01T13:00:00.000Z"), value: 999 },
    ]);

    const lecturas = new RepositorioLecturasVentanaDrizzle(db);
    const enVentana = await lecturas.leerVentana(
      sensorTempId,
      new Date("2026-01-01T09:30:00.000Z"),
      new Date("2026-01-01T12:00:00.000Z"),
    );

    expect(enVentana.map((l) => l.value)).toEqual([60, 80]);
  });

  it("RepositorioFallasDrizzle: crea, busca, actualiza estado y lista con filtros", async () => {
    const fallas = new RepositorioFallasDrizzle(db);
    const reporte = {
      id: randomUUID(),
      machineId: maquinaPrensaId,
      reportadoPor: operadorEnsamble.id,
      sintomaTaxonomia: "fuga" as const,
      sintomaOtro: null,
      descripcion: "fuga de aceite en la prensa",
      severidad: 2 as const,
      fotos: [] as readonly string[],
      origen: "formulario" as const,
      estado: "abierto" as const,
      creadoEn: new Date(),
    };

    await fallas.crear(reporte);
    expect(await fallas.buscarPorId(reporte.id)).toEqual(reporte);
    expect(await fallas.buscarPorId(randomUUID())).toBeNull();

    await fallas.actualizarEstado(reporte.id, "en_revision");
    expect((await fallas.buscarPorId(reporte.id))?.estado).toBe("en_revision");

    expect((await fallas.listar({ machineId: maquinaPrensaId })).map((f) => f.id)).toContain(reporte.id);
    expect((await fallas.listar({ machineId: maquinaTornoId })).map((f) => f.id)).not.toContain(reporte.id);
    expect((await fallas.listar({ estado: "en_revision" })).map((f) => f.id)).toContain(reporte.id);
    expect((await fallas.listar({ estado: "cerrado" })).map((f) => f.id)).not.toContain(reporte.id);
    expect((await fallas.listar({ areaIds: [areaEnsambleId] })).map((f) => f.id)).toContain(reporte.id);
    expect((await fallas.listar({ areaIds: [areaMaquinadoId] })).map((f) => f.id)).not.toContain(reporte.id);
  });

  it("RepositorioSnapshotsFallaDrizzle y RepositorioNotificacionesDrizzle: crean y listan", async () => {
    const fallas = new RepositorioFallasDrizzle(db);
    const reporte = {
      id: randomUUID(),
      machineId: maquinaPrensaId,
      reportadoPor: operadorEnsamble.id,
      sintomaTaxonomia: "sobrecalentamiento" as const,
      sintomaOtro: null,
      descripcion: "temperatura alta",
      severidad: 3 as const,
      fotos: [] as readonly string[],
      origen: "agente" as const,
      estado: "abierto" as const,
      creadoEn: new Date(),
    };
    await fallas.crear(reporte);

    const snapshots = new RepositorioSnapshotsFallaDrizzle(db);
    const snapshot = {
      id: randomUUID(),
      failureReportId: reporte.id,
      sensorId: sensorTempId,
      ventanaInicio: new Date("2026-01-01T09:00:00.000Z"),
      ventanaFin: new Date("2026-01-01T10:00:00.000Z"),
      min: 60,
      max: 60,
      avg: 60,
      last: 60,
    };
    await snapshots.crear(snapshot);
    expect(await snapshots.listarPorReporte(reporte.id)).toEqual([snapshot]);

    const notificaciones = new RepositorioNotificacionesDrizzle(db);
    const notificacion = {
      id: randomUUID(),
      areaId: areaEnsambleId,
      tipo: "falla_reportada",
      referenciaId: reporte.id,
      creadaEn: new Date(),
    };
    await notificaciones.crear(notificacion);
    expect(await notificaciones.listar(areaEnsambleId)).toContainEqual(notificacion);
    expect((await notificaciones.listar()).map((n) => n.id)).toContain(notificacion.id);
    expect(await notificaciones.listar(areaMaquinadoId)).not.toContainEqual(notificacion);
  });

  it("flujo completo: crearReporteFalla persiste, publica el evento y dispara snapshot + notificación", async () => {
    const maquinas = new RepositorioMaquinasDrizzle(db);
    const areasUsuario = new RepositorioAreasUsuarioDrizzle(db);
    const fallas = new RepositorioFallasDrizzle(db);
    const sensoresRepo = new RepositorioSensoresPorMaquinaDrizzle(db);
    const lecturasRepo = new RepositorioLecturasVentanaDrizzle(db);
    const snapshotsRepo = new RepositorioSnapshotsFallaDrizzle(db);
    const notificacionesRepo = new RepositorioNotificacionesDrizzle(db);
    const bus = new BusEventos();

    const trabajosEncolados: Array<{ tipo: string; payload: Record<string, unknown> }> = [];
    const cola: ColaTrabajos = {
      async encolar(tipo, payload) {
        trabajosEncolados.push({ tipo, payload });
      },
    };

    registrarManejadoresFalla(bus, { cola, notificaciones: notificacionesRepo, generarId: randomUUID });

    const ahora = new Date("2026-01-01T12:00:00.000Z");
    const reporte = await crearReporteFalla(
      { maquinas, areasUsuario, fallas, bus, generarId: randomUUID },
      {
        usuario: operadorEnsamble,
        machineId: maquinaPrensaId,
        sintomaTaxonomia: "vibracion_excesiva",
        descripcion: "vibra más de lo normal",
        severidad: 2,
        fotos: [],
        origen: "agente",
        ahora,
      },
    );

    expect(await fallas.buscarPorId(reporte.id)).toEqual(reporte);

    expect(trabajosEncolados).toEqual([
      {
        tipo: TRABAJO_MATERIALIZAR_SNAPSHOT,
        payload: { failureReportId: reporte.id, machineId: maquinaPrensaId, ocurridoEn: ahora.toISOString() },
      },
    ]);

    const notificaciones = await notificacionesRepo.listar(areaEnsambleId);
    expect(notificaciones.some((n) => n.referenciaId === reporte.id)).toBe(true);

    await materializarSnapshotFalla(
      { sensores: sensoresRepo, lecturas: lecturasRepo, snapshots: snapshotsRepo, generarId: randomUUID, horasVentana: 4 },
      { failureReportId: reporte.id, machineId: maquinaPrensaId, ocurridoEn: ahora },
    );

    const snapshotsGuardados = await snapshotsRepo.listarPorReporte(reporte.id);
    expect(snapshotsGuardados).toHaveLength(1);
    expect(snapshotsGuardados[0]?.sensorId).toBe(sensorTempId);

    const actualizado = await cambiarEstadoFalla({ fallas }, { id: reporte.id, siguiente: "en_revision" });
    expect(actualizado.estado).toBe("en_revision");
  });
});
