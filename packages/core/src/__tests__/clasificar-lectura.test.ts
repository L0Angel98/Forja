import { describe, expect, it } from "vitest";
import { clasificarLectura } from "../clasificar-lectura";
import type { SensorCatalogo } from "../entities/sensor-catalogo";

const AHORA = new Date("2026-01-01T12:00:00.000Z");

const SENSOR: SensorCatalogo = {
  id: "sensor-1",
  externalId: "prensa-temp-1",
  machineId: "maquina-1",
  nombre: "Temperatura",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};

describe("clasificarLectura", () => {
  it("acepta una lectura numérica dentro de rango", () => {
    const resultado = clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: 42, ahora: AHORA });

    expect(resultado).toEqual({
      tipo: "aceptada",
      lectura: { sensorId: "sensor-1", ts: AHORA, value: 42, fueraDeRango: false },
    });
  });

  it("acepta un valor numérico enviado como string", () => {
    const resultado = clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: "42.5", ahora: AHORA });

    expect(resultado).toEqual({
      tipo: "aceptada",
      lectura: { sensorId: "sensor-1", ts: AHORA, value: 42.5, fueraDeRango: false },
    });
  });

  it("acepta y marca fueraDeRango un valor numérico fuera del rango físico (no se descarta)", () => {
    const resultado = clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: 999, ahora: AHORA });

    expect(resultado).toEqual({
      tipo: "aceptada",
      lectura: { sensorId: "sensor-1", ts: AHORA, value: 999, fueraDeRango: true },
    });
  });

  it("manda a cuarentena un sensor desconocido", () => {
    const resultado = clasificarLectura({ sensor: null, ts: AHORA, valorCrudo: 42, ahora: AHORA });

    expect(resultado).toEqual({ tipo: "cuarentena", motivo: "sensor_desconocido" });
  });

  it("manda a cuarentena un payload no numérico", () => {
    expect(clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: "abc", ahora: AHORA })).toEqual({
      tipo: "cuarentena",
      motivo: "payload_no_numerico",
    });
    expect(clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: null, ahora: AHORA })).toEqual({
      tipo: "cuarentena",
      motivo: "payload_no_numerico",
    });
    expect(clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: {}, ahora: AHORA })).toEqual({
      tipo: "cuarentena",
      motivo: "payload_no_numerico",
    });
    expect(clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: "", ahora: AHORA })).toEqual({
      tipo: "cuarentena",
      motivo: "payload_no_numerico",
    });
    expect(clasificarLectura({ sensor: SENSOR, ts: AHORA, valorCrudo: NaN, ahora: AHORA })).toEqual({
      tipo: "cuarentena",
      motivo: "payload_no_numerico",
    });
  });

  it("manda a cuarentena un timestamp más de 24h en el futuro", () => {
    const tsFuturo = new Date(AHORA.getTime() + 25 * 60 * 60 * 1000);
    expect(clasificarLectura({ sensor: SENSOR, ts: tsFuturo, valorCrudo: 42, ahora: AHORA })).toEqual({
      tipo: "cuarentena",
      motivo: "timestamp_futuro",
    });
  });

  it("acepta un timestamp justo dentro de la ventana de 24h", () => {
    const tsLimite = new Date(AHORA.getTime() + 24 * 60 * 60 * 1000);
    const resultado = clasificarLectura({ sensor: SENSOR, ts: tsLimite, valorCrudo: 42, ahora: AHORA });
    expect(resultado.tipo).toBe("aceptada");
  });
});
