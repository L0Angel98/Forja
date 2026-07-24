import { randomUUID } from "node:crypto";
import type { LecturaCuarentena, LecturaIngerida } from "@forja/core";
import {
  crearCliente,
  databaseUrl,
  RepositorioCatalogoSensoresDrizzle,
  RepositorioCuarentenaDrizzle,
  RepositorioEstadoIngestaDrizzle,
  RepositorioLecturasDrizzle,
} from "@forja/db";
import { sql } from "drizzle-orm";
import { iniciarBrokerMqtt } from "./broker";
import { BufferCircular } from "./buffer-circular";
import { CacheCatalogoSensores } from "./catalogo-cache";
import { cargarConfiguracion } from "./config";
import { Flusher } from "./flusher";
import { iniciarProgramadorFlush } from "./programador-flush";
import { ProcesadorMensajesMqtt } from "./procesador-mensajes";

async function main(): Promise<void> {
  const config = cargarConfiguracion();
  const { db, cerrar } = crearCliente(databaseUrl());
  await db.execute(sql`select 1`);

  const catalogoRepo = new RepositorioCatalogoSensoresDrizzle(db);
  const lecturasRepo = new RepositorioLecturasDrizzle(db);
  const cuarentenaRepo = new RepositorioCuarentenaDrizzle(db);
  const estadoIngestaRepo = new RepositorioEstadoIngestaDrizzle(db);

  const catalogo = new CacheCatalogoSensores(catalogoRepo);
  await catalogo.refrescar();
  const detenerRefrescoCatalogo = catalogo.iniciarRefrescoPeriodico(config.refrescoCatalogoMs);

  const bufferLecturas = new BufferCircular<LecturaIngerida>(config.bufferMaximo);
  const bufferCuarentena = new BufferCircular<LecturaCuarentena>(config.bufferMaximo);

  const procesador = new ProcesadorMensajesMqtt({
    catalogo,
    bufferLecturas,
    bufferCuarentena,
    generarId: randomUUID,
    ahora: () => new Date(),
  });

  const flusher = new Flusher(
    { lecturas: lecturasRepo, cuarentena: cuarentenaRepo, estadoIngesta: estadoIngestaRepo },
    { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
    { flushMaxLecturas: config.flushMaxLecturas },
  );

  const detenerProgramadorFlush = iniciarProgramadorFlush(flusher, {
    intervaloMs: config.flushIntervaloMs,
    backoffInicialMs: config.backoffInicialMs,
    backoffMaximoMs: config.backoffMaximoMs,
  });

  if (!config.credencialesDispositivos) {
    console.warn("ingest: MQTT_DEVICE_CREDENTIALS no configurado, el broker acepta conexiones sin autenticación.");
  }

  const broker = await iniciarBrokerMqtt(
    {
      puerto: config.mqttPort,
      flushMaxLecturas: config.flushMaxLecturas,
      credenciales: config.credencialesDispositivos,
    },
    procesador,
    flusher,
    () => bufferLecturas.tamano,
  );

  console.log(`ingest: broker MQTT escuchando en el puerto ${config.mqttPort}.`);

  const detener = async (): Promise<void> => {
    detenerRefrescoCatalogo();
    detenerProgramadorFlush();
    await broker.cerrar();
    await flusher.flush().catch((error: unknown) => {
      console.error("ingest: fallo al volcar el buffer durante el apagado", error);
    });
    await cerrar();
    process.exit(0);
  };
  process.on("SIGTERM", () => void detener());
  process.on("SIGINT", () => void detener());

  await new Promise(() => {
    // Proceso de ingesta de larga duración; ciclo de vida independiente de
    // `server` a propósito (§3 del plan de infraestructura).
  });
}

main().catch((error: unknown) => {
  console.error("Error en el proceso de ingesta:", error);
  process.exit(1);
});
