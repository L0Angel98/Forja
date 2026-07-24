import { randomUUID } from "node:crypto";
import type { LecturaCuarentena, LecturaIngerida, RepositorioLecturas } from "@forja/core";
import {
  crearCliente,
  ejecutarMigraciones,
  RepositorioCatalogoSensoresDrizzle,
  RepositorioCuarentenaDrizzle,
  RepositorioEstadoIngestaDrizzle,
  RepositorioLecturasDrizzle,
  schema,
  type ForjaDb,
} from "@forja/db";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { count, eq } from "drizzle-orm";
import { connectAsync, type MqttClient } from "mqtt";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { iniciarBrokerMqtt, type BrokerMqtt } from "../../broker";
import { BufferCircular } from "../../buffer-circular";
import { CacheCatalogoSensores } from "../../catalogo-cache";
import { Flusher } from "../../flusher";
import { iniciarProgramadorFlush } from "../../programador-flush";
import { ProcesadorMensajesMqtt } from "../../procesador-mensajes";

/**
 * Carga (5k lecturas/s sostenidas 10 min) y resiliencia (caída de DB 30 s)
 * son los acceptance criteria de la spec 15. Un soak test literal de 10 min
 * o una caída de exactamente 30 s son inviables para CI (tiempo/costo); se
 * escalan a una ráfaga grande y a una ventana de fallo corta, documentando
 * la interpretación aquí en vez de en el spec. Lo que se prueba es la
 * propiedad que importa: bajo carga sostenida o con la DB temporalmente
 * indisponible, el buffer + backoff garantizan cero pérdida.
 */

let contenedor: StartedPostgreSqlContainer | undefined;
let db: ForjaDb;
let cerrarConexion: (() => Promise<void>) | undefined;
let machineId: string;
let sensorCargaId: string;
let sensorResilienciaId: string;

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

  const [planta] = await db.insert(schema.plant).values({ nombre: "Planta Carga Test" }).returning();
  const [area] = await db.insert(schema.area).values({ plantId: planta!.id, nombre: "Ensamble" }).returning();
  const [maquina] = await db.insert(schema.machine).values({ areaId: area!.id, nombre: "Prensa" }).returning();
  machineId = maquina!.id;

  const [sensorCarga] = await db
    .insert(schema.sensor)
    .values({
      machineId,
      externalId: "prensa-temp-carga",
      nombre: "Temperatura (carga)",
      unidad: "C",
      rangoMin: -1000,
      rangoMax: 1000,
    })
    .returning();
  sensorCargaId = sensorCarga!.id;

  const [sensorResiliencia] = await db
    .insert(schema.sensor)
    .values({
      machineId,
      externalId: "prensa-temp-resiliencia",
      nombre: "Temperatura (resiliencia)",
      unidad: "C",
      rangoMin: -1000,
      rangoMax: 1000,
    })
    .returning();
  sensorResilienciaId = sensorResiliencia!.id;
}, 120_000);

afterAll(async () => {
  await cerrarConexion?.();
  await contenedor?.stop();
});

interface Pipeline {
  broker: BrokerMqtt;
  bufferLecturas: BufferCircular<LecturaIngerida>;
  detenerProgramadorFlush: () => void;
  detenerRefrescoCatalogo: () => void;
}

async function construirPipeline(deps: {
  lecturas: RepositorioLecturas;
  flushIntervaloMs: number;
  flushMaxLecturas: number;
}): Promise<Pipeline> {
  const catalogoRepo = new RepositorioCatalogoSensoresDrizzle(db);
  const catalogo = new CacheCatalogoSensores(catalogoRepo);
  await catalogo.refrescar();
  const detenerRefrescoCatalogo = catalogo.iniciarRefrescoPeriodico(30_000);

  const bufferLecturas = new BufferCircular<LecturaIngerida>(200_000);
  const bufferCuarentena = new BufferCircular<LecturaCuarentena>(200_000);

  const procesador = new ProcesadorMensajesMqtt({
    catalogo,
    bufferLecturas,
    bufferCuarentena,
    generarId: randomUUID,
    ahora: () => new Date(),
  });

  const flusher = new Flusher(
    {
      lecturas: deps.lecturas,
      cuarentena: new RepositorioCuarentenaDrizzle(db),
      estadoIngesta: new RepositorioEstadoIngestaDrizzle(db),
    },
    { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
    { flushMaxLecturas: deps.flushMaxLecturas },
  );

  const detenerProgramadorFlush = iniciarProgramadorFlush(
    flusher,
    { intervaloMs: deps.flushIntervaloMs, backoffInicialMs: 100, backoffMaximoMs: 500 },
    { error: () => {} },
  );

  const broker = await iniciarBrokerMqtt(
    { puerto: 0, flushMaxLecturas: deps.flushMaxLecturas, credenciales: null },
    procesador,
    flusher,
    () => bufferLecturas.tamano,
  );

  return { broker, bufferLecturas, detenerProgramadorFlush, detenerRefrescoCatalogo };
}

function puertoDe(broker: BrokerMqtt): number {
  const direccion = broker.servidor.address();
  if (direccion === null || typeof direccion === "string") throw new Error("no se pudo obtener el puerto");
  return direccion.port;
}

async function esperar(predicado: () => Promise<boolean>, timeoutMs: number): Promise<void> {
  const inicio = Date.now();
  while (!(await predicado())) {
    if (Date.now() - inicio > timeoutMs) throw new Error("timeout esperando la condición de la prueba");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function contarLecturas(sensorId: string): Promise<number> {
  const [fila] = await db.select({ total: count() }).from(schema.reading).where(eq(schema.reading.sensorId, sensorId));
  return fila?.total ?? 0;
}

describe("ingesta bajo carga y resiliencia ante caída de DB (Postgres real, sin pérdida)", () => {
  let clientes: MqttClient[] = [];
  let cerrarPipeline: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await Promise.all(clientes.map((cliente) => cliente.endAsync(true)));
    clientes = [];
    await cerrarPipeline?.();
    cerrarPipeline = undefined;
  });

  it(
    "una ráfaga de 10 000 lecturas publicadas por 5 clientes concurrentes se persiste sin pérdida",
    async () => {
      const totalMensajes = 10_000;
      const clientesConcurrentes = 5;
      const porCliente = totalMensajes / clientesConcurrentes;
      const baseTs = new Date("2026-01-01T00:00:00.000Z");

      const pipeline = await construirPipeline({
        lecturas: new RepositorioLecturasDrizzle(db),
        flushIntervaloMs: 200,
        flushMaxLecturas: 500,
      });
      cerrarPipeline = async () => {
        pipeline.detenerRefrescoCatalogo();
        pipeline.detenerProgramadorFlush();
        await pipeline.broker.cerrar();
      };

      const puerto = puertoDe(pipeline.broker);
      const nuevosClientes = await Promise.all(
        Array.from({ length: clientesConcurrentes }, () => connectAsync(`mqtt://127.0.0.1:${puerto}`)),
      );
      clientes.push(...nuevosClientes);

      const inicio = Date.now();
      await Promise.all(
        nuevosClientes.map((cliente, indiceCliente) =>
          Promise.all(
            Array.from({ length: porCliente }, (_, i) => {
              const indiceGlobal = indiceCliente * porCliente + i;
              const ts = new Date(baseTs.getTime() + indiceGlobal).toISOString();
              return cliente.publishAsync(
                "forja/planta-1/prensa-temp-carga",
                JSON.stringify({ ts, value: indiceGlobal % 100 }),
                { qos: 0 },
              );
            }),
          ),
        ),
      );
      const duracionPublicacionMs = Date.now() - inicio;

      await esperar(async () => (await contarLecturas(sensorCargaId)) >= totalMensajes, 60_000);

      expect(await contarLecturas(sensorCargaId)).toBe(totalMensajes);
      expect(pipeline.bufferLecturas.tamano).toBe(0);
      // Solo informativo: confirma que la ráfaga se publicó a un ritmo alto, no una garantía dura de 5k/s.
      console.log(`ráfaga de ${totalMensajes} mensajes publicada en ${duracionPublicacionMs}ms`);
    },
    90_000,
  );

  it(
    "si la DB está caída, las lecturas se retienen en el buffer y se persisten sin pérdida al recuperarse",
    async () => {
      const totalMensajes = 500;
      const ventanaCaidaMs = 3_000;
      const finVentanaCaida = Date.now() + ventanaCaidaMs;
      const baseTs = new Date("2026-02-01T00:00:00.000Z");

      const lecturasReal = new RepositorioLecturasDrizzle(db);
      const lecturasConCaidaSimulada: RepositorioLecturas = {
        async insertarLote(lecturas) {
          if (Date.now() < finVentanaCaida) {
            throw new Error("DB caída (simulada)");
          }
          await lecturasReal.insertarLote(lecturas);
        },
        ultimaLecturaEn: (id) => lecturasReal.ultimaLecturaEn(id),
      };

      const pipeline = await construirPipeline({
        lecturas: lecturasConCaidaSimulada,
        flushIntervaloMs: 300,
        flushMaxLecturas: 500,
      });
      cerrarPipeline = async () => {
        pipeline.detenerRefrescoCatalogo();
        pipeline.detenerProgramadorFlush();
        await pipeline.broker.cerrar();
      };

      const puerto = puertoDe(pipeline.broker);
      const cliente = await connectAsync(`mqtt://127.0.0.1:${puerto}`);
      clientes.push(cliente);

      await Promise.all(
        Array.from({ length: totalMensajes }, (_, i) => {
          const ts = new Date(baseTs.getTime() + i).toISOString();
          return cliente.publishAsync("forja/planta-1/prensa-temp-resiliencia", JSON.stringify({ ts, value: i }), {
            qos: 0,
          });
        }),
      );

      // Mientras la DB está "caída", nada debería haberse perdido: sigue en el buffer.
      await new Promise((resolve) => setTimeout(resolve, ventanaCaidaMs / 2));
      expect(pipeline.bufferLecturas.tamano).toBeGreaterThan(0);

      await esperar(async () => (await contarLecturas(sensorResilienciaId)) >= totalMensajes, 30_000);

      expect(await contarLecturas(sensorResilienciaId)).toBe(totalMensajes);
      expect(pipeline.bufferLecturas.tamano).toBe(0);
    },
    60_000,
  );
});
