import { randomUUID } from "node:crypto";
import {
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioCuarentenaFalso,
  crearRepositorioEstadoIngestaFalso,
  crearRepositorioLecturasFalso,
  type LecturaCuarentena,
  type LecturaIngerida,
  type SensorCatalogo,
} from "@forja/core";
import { connectAsync, type MqttClient } from "mqtt";
import { afterEach, describe, expect, it } from "vitest";
import { iniciarBrokerMqtt, type BrokerMqtt } from "../broker";
import { BufferCircular } from "../buffer-circular";
import { CacheCatalogoSensores } from "../catalogo-cache";
import { Flusher } from "../flusher";
import { ProcesadorMensajesMqtt } from "../procesador-mensajes";

const sensor: SensorCatalogo = {
  id: "sensor-1",
  externalId: "prensa-temp-1",
  machineId: "maquina-1",
  nombre: "Temperatura",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 200,
  mudoTrasMinutos: 60,
};

interface OpcionesBroker {
  readonly credenciales?: ReadonlyMap<string, string> | null;
  readonly flushMaxLecturas?: number;
}

async function crearBroker(opciones: OpcionesBroker = {}) {
  const catalogoRepo = crearRepositorioCatalogoSensoresFalso([sensor]);
  const catalogo = new CacheCatalogoSensores(catalogoRepo);
  await catalogo.refrescar();

  const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
  const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
  const lecturasRepo = crearRepositorioLecturasFalso();
  const cuarentenaRepo = crearRepositorioCuarentenaFalso();
  const estadoRepo = crearRepositorioEstadoIngestaFalso();

  const procesador = new ProcesadorMensajesMqtt({
    catalogo,
    bufferLecturas,
    bufferCuarentena,
    generarId: randomUUID,
    ahora: () => new Date(),
  });

  const flushMaxLecturas = opciones.flushMaxLecturas ?? 500;
  const flusher = new Flusher(
    { lecturas: lecturasRepo, cuarentena: cuarentenaRepo, estadoIngesta: estadoRepo },
    { lecturas: bufferLecturas, cuarentena: bufferCuarentena },
    { flushMaxLecturas },
  );

  const broker = await iniciarBrokerMqtt(
    { puerto: 0, flushMaxLecturas, credenciales: opciones.credenciales ?? null },
    procesador,
    flusher,
    () => bufferLecturas.tamano,
  );

  return { broker, bufferLecturas, bufferCuarentena, lecturasRepo, cuarentenaRepo };
}

function puertoDe(broker: BrokerMqtt): number {
  const direccion = broker.servidor.address();
  if (direccion === null || typeof direccion === "string") {
    throw new Error("no se pudo obtener el puerto del servidor MQTT de prueba");
  }
  return direccion.port;
}

async function esperar(predicado: () => boolean, timeoutMs = 2000): Promise<void> {
  const inicio = Date.now();
  while (!predicado()) {
    if (Date.now() - inicio > timeoutMs) throw new Error("timeout esperando la condición");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("iniciarBrokerMqtt (Aedes real sobre TCP loopback)", () => {
  let cerrarBroker: (() => Promise<void>) | undefined;
  let clientes: MqttClient[] = [];

  afterEach(async () => {
    await Promise.all(clientes.map((cliente) => cliente.endAsync(true)));
    clientes = [];
    await cerrarBroker?.();
    cerrarBroker = undefined;
  });

  it("procesa un mensaje publicado por MQTT y lo deposita en el buffer de lecturas", async () => {
    const { broker, bufferLecturas } = await crearBroker();
    cerrarBroker = broker.cerrar;

    const cliente = await connectAsync(`mqtt://127.0.0.1:${puertoDe(broker)}`);
    clientes.push(cliente);

    await cliente.publishAsync(
      "forja/planta-1/prensa-temp-1",
      JSON.stringify({ ts: new Date().toISOString(), value: 60 }),
    );

    await esperar(() => bufferLecturas.tamano === 1);
    expect(bufferLecturas.primero()?.value).toBe(60);
    expect(bufferLecturas.primero()?.sensorId).toBe(sensor.id);
  });

  it("un sensor desconocido termina en el buffer de cuarentena, no en el de lecturas", async () => {
    const { broker, bufferLecturas, bufferCuarentena } = await crearBroker();
    cerrarBroker = broker.cerrar;

    const cliente = await connectAsync(`mqtt://127.0.0.1:${puertoDe(broker)}`);
    clientes.push(cliente);

    await cliente.publishAsync(
      "forja/planta-1/sensor-fantasma",
      JSON.stringify({ ts: new Date().toISOString(), value: 60 }),
    );

    await esperar(() => bufferCuarentena.tamano === 1);
    expect(bufferLecturas.tamano).toBe(0);
    expect(bufferCuarentena.primero()?.motivo).toBe("sensor_desconocido");
  });

  it("flushea automáticamente a la DB (fake) al alcanzar flushMaxLecturas", async () => {
    const { broker, bufferLecturas, lecturasRepo } = await crearBroker({ flushMaxLecturas: 2 });
    cerrarBroker = broker.cerrar;

    const cliente = await connectAsync(`mqtt://127.0.0.1:${puertoDe(broker)}`);
    clientes.push(cliente);

    for (let i = 0; i < 2; i++) {
      await cliente.publishAsync(
        "forja/planta-1/prensa-temp-1",
        JSON.stringify({ ts: new Date().toISOString(), value: i }),
      );
    }

    await esperar(() => lecturasRepo.lecturas.length === 2);
    expect(bufferLecturas.tamano).toBe(0);
  });

  it("rechaza conexiones con credenciales inválidas cuando la autenticación está habilitada", async () => {
    const { broker } = await crearBroker({ credenciales: new Map([["gateway-1", "secreto"]]) });
    cerrarBroker = broker.cerrar;

    await expect(
      connectAsync(
        `mqtt://127.0.0.1:${puertoDe(broker)}`,
        { username: "gateway-1", password: "incorrecta", reconnectPeriod: 0, connectTimeout: 2000 },
        false,
      ),
    ).rejects.toThrow();
  });

  it("acepta conexiones con credenciales válidas y procesa el mensaje", async () => {
    const { broker, bufferLecturas } = await crearBroker({ credenciales: new Map([["gateway-1", "secreto"]]) });
    cerrarBroker = broker.cerrar;

    const cliente = await connectAsync(`mqtt://127.0.0.1:${puertoDe(broker)}`, {
      username: "gateway-1",
      password: "secreto",
    });
    clientes.push(cliente);

    await cliente.publishAsync(
      "forja/planta-1/prensa-temp-1",
      JSON.stringify({ ts: new Date().toISOString(), value: 42 }),
    );

    await esperar(() => bufferLecturas.tamano === 1);
    expect(bufferLecturas.primero()?.value).toBe(42);
  });
});
