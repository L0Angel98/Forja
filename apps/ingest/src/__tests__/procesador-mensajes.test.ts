import { crearRepositorioCatalogoSensoresFalso, type LecturaCuarentena, type LecturaIngerida, type SensorCatalogo } from "@forja/core";
import { describe, expect, it } from "vitest";
import { BufferCircular } from "../buffer-circular";
import { CacheCatalogoSensores } from "../catalogo-cache";
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

describe("ProcesadorMensajesMqtt", () => {
  it("mensaje válido dentro de rango se acepta con fuera_de_rango=false", async () => {
    const catalogoRepo = crearRepositorioCatalogoSensoresFalso([sensor]);
    const catalogo = new CacheCatalogoSensores(catalogoRepo);
    await catalogo.refrescar();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    let idsGenerados = 0;
    const procesador = new ProcesadorMensajesMqtt({
      catalogo,
      bufferLecturas,
      bufferCuarentena,
      generarId: () => `id-${++idsGenerados}`,
      ahora: () => new Date("2026-01-01T12:00:00.000Z"),
    });

    procesador.procesar("forja/planta-1/prensa-temp-1", '{"ts":"2026-01-01T11:59:00.000Z","value":60}');

    expect(bufferLecturas.tamano).toBe(1);
    expect(bufferLecturas.primero()).toEqual({
      sensorId: "sensor-1",
      ts: new Date("2026-01-01T11:59:00.000Z"),
      value: 60,
      fueraDeRango: false,
    });
    expect(bufferCuarentena.tamano).toBe(0);
  });

  it("valor fuera del rango físico se acepta igual, marcado fuera_de_rango=true", async () => {
    const catalogoRepo = crearRepositorioCatalogoSensoresFalso([sensor]);
    const catalogo = new CacheCatalogoSensores(catalogoRepo);
    await catalogo.refrescar();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    const procesador = new ProcesadorMensajesMqtt({
      catalogo,
      bufferLecturas,
      bufferCuarentena,
      generarId: () => "id-1",
      ahora: () => new Date("2026-01-01T12:00:00.000Z"),
    });

    procesador.procesar("forja/planta-1/prensa-temp-1", '{"ts":"2026-01-01T11:59:00.000Z","value":999}');

    expect(bufferLecturas.primero()?.fueraDeRango).toBe(true);
    expect(bufferCuarentena.tamano).toBe(0);
  });

  it("sensor desconocido va a cuarentena con motivo sensor_desconocido", async () => {
    const catalogoRepo = crearRepositorioCatalogoSensoresFalso([]);
    const catalogo = new CacheCatalogoSensores(catalogoRepo);
    await catalogo.refrescar();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    const procesador = new ProcesadorMensajesMqtt({
      catalogo,
      bufferLecturas,
      bufferCuarentena,
      generarId: () => "id-1",
      ahora: () => new Date("2026-01-01T12:00:00.000Z"),
    });

    procesador.procesar("forja/planta-1/sensor-fantasma", '{"ts":"2026-01-01T11:59:00.000Z","value":60}');

    expect(bufferLecturas.tamano).toBe(0);
    expect(bufferCuarentena.primero()).toEqual({
      id: "id-1",
      sensorExternalId: "sensor-fantasma",
      payloadCrudo: '{"ts":"2026-01-01T11:59:00.000Z","value":60}',
      motivo: "sensor_desconocido",
      ts: new Date("2026-01-01T11:59:00.000Z"),
      recibidoEn: new Date("2026-01-01T12:00:00.000Z"),
    });
  });

  it("payload no numérico va a cuarentena con motivo payload_no_numerico", async () => {
    const catalogoRepo = crearRepositorioCatalogoSensoresFalso([sensor]);
    const catalogo = new CacheCatalogoSensores(catalogoRepo);
    await catalogo.refrescar();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    const procesador = new ProcesadorMensajesMqtt({
      catalogo,
      bufferLecturas,
      bufferCuarentena,
      generarId: () => "id-1",
      ahora: () => new Date("2026-01-01T12:00:00.000Z"),
    });

    procesador.procesar("forja/planta-1/prensa-temp-1", "esto no es json");

    expect(bufferLecturas.tamano).toBe(0);
    expect(bufferCuarentena.primero()?.motivo).toBe("payload_no_numerico");
    expect(bufferCuarentena.primero()?.ts).toBeNull();
  });

  it("ts más de 24h en el futuro va a cuarentena con motivo timestamp_futuro", async () => {
    const catalogoRepo = crearRepositorioCatalogoSensoresFalso([sensor]);
    const catalogo = new CacheCatalogoSensores(catalogoRepo);
    await catalogo.refrescar();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    const procesador = new ProcesadorMensajesMqtt({
      catalogo,
      bufferLecturas,
      bufferCuarentena,
      generarId: () => "id-1",
      ahora: () => new Date("2026-01-01T12:00:00.000Z"),
    });

    procesador.procesar("forja/planta-1/prensa-temp-1", '{"ts":"2026-01-05T12:00:00.000Z","value":60}');

    expect(bufferLecturas.tamano).toBe(0);
    expect(bufferCuarentena.primero()?.motivo).toBe("timestamp_futuro");
  });

  it("tópico que no matchea forja/{plantId}/{sensorId} se ignora silenciosamente", async () => {
    const catalogoRepo = crearRepositorioCatalogoSensoresFalso([sensor]);
    const catalogo = new CacheCatalogoSensores(catalogoRepo);
    await catalogo.refrescar();

    const bufferLecturas = new BufferCircular<LecturaIngerida>(1000);
    const bufferCuarentena = new BufferCircular<LecturaCuarentena>(1000);
    const procesador = new ProcesadorMensajesMqtt({
      catalogo,
      bufferLecturas,
      bufferCuarentena,
      generarId: () => "id-1",
      ahora: () => new Date("2026-01-01T12:00:00.000Z"),
    });

    procesador.procesar("$SYS/broker/heartbeat", "1");

    expect(bufferLecturas.tamano).toBe(0);
    expect(bufferCuarentena.tamano).toBe(0);
  });
});
