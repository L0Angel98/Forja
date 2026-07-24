import { describe, expect, it } from "vitest";
import { consultarSensores } from "../consultar-sensores";
import { MaquinaFueraDeArea } from "../../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../../errors/maquina-no-encontrada";
import { RangoConsultaDemasiadoAmplio } from "../../errors/rango-consulta-demasiado-amplio";
import { SensorNoEncontrado } from "../../errors/sensor-no-encontrado";
import type { Maquina } from "../../entities/maquina";
import type { SensorCatalogo } from "../../entities/sensor-catalogo";
import type { Usuario } from "../../entities/usuario";
import {
  crearRepositorioAgregacionesSensoresFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioMaquinasFalso,
} from "../../testing/fakes";

const AHORA = new Date("2026-01-08T00:00:00.000Z");
const HACE_UNA_SEMANA = new Date("2026-01-01T00:00:00.000Z");

const prensa: Maquina = { id: "maquina-1", areaId: "area-ensamble", nombre: "Prensa" };
const torno: Maquina = { id: "maquina-2", areaId: "area-maquinado", nombre: "Torno CNC" };

const sensorTemp: SensorCatalogo = {
  id: "sensor-temp",
  externalId: "prensa-temp",
  machineId: prensa.id,
  nombre: "Temperatura",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};
const sensorVibracion: SensorCatalogo = {
  id: "sensor-vib",
  externalId: "prensa-vib",
  machineId: prensa.id,
  nombre: "Vibración",
  unidad: "mm/s",
  rangoMin: 0,
  rangoMax: 25,
  mudoTrasMinutos: 60,
};

const operadorEnsamble: Usuario = {
  id: "usuario-op",
  email: "operador@planta.mx",
  passwordHash: "hash:x",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

const supervisor: Usuario = {
  id: "usuario-sup",
  email: "supervisor@planta.mx",
  passwordHash: "hash:x",
  nombre: "Supervisor",
  rol: "supervisor",
  activo: true,
};

function construir() {
  return {
    maquinas: crearRepositorioMaquinasFalso([prensa, torno]),
    areasUsuario: crearRepositorioAreasUsuarioFalso({ [operadorEnsamble.id]: ["area-ensamble"] }),
    catalogo: crearRepositorioCatalogoSensoresFalso([sensorTemp, sensorVibracion]),
    agregaciones: crearRepositorioAgregacionesSensoresFalso([
      { sensorId: sensorTemp.id, ts: new Date("2026-01-02T00:00:00.000Z"), value: 60, fueraDeRango: false },
      { sensorId: sensorTemp.id, ts: new Date("2026-01-03T00:00:00.000Z"), value: 70, fueraDeRango: false },
      { sensorId: sensorVibracion.id, ts: new Date("2026-01-02T00:00:00.000Z"), value: 5, fueraDeRango: false },
    ]),
  };
}

describe("consultarSensores", () => {
  it("consulta un sensor específico de una máquina", async () => {
    const deps = construir();

    const series = await consultarSensores(deps, {
      usuario: operadorEnsamble,
      maquinaId: prensa.id,
      sensorId: sensorTemp.id,
      agregacion: "avg",
      bucket: "1d",
      desde: HACE_UNA_SEMANA,
      hasta: AHORA,
    });

    expect(series).toHaveLength(1);
    expect(series[0]?.sensorId).toBe(sensorTemp.id);
    expect(series[0]?.puntos.length).toBeGreaterThan(0);
  });

  it("sin sensorId, consulta todos los sensores de la máquina", async () => {
    const deps = construir();

    const series = await consultarSensores(deps, {
      usuario: supervisor,
      maquinaId: prensa.id,
      agregacion: "max",
      bucket: "1d",
      desde: HACE_UNA_SEMANA,
      hasta: AHORA,
    });

    expect(series.map((s) => s.sensorId).sort()).toEqual([sensorTemp.id, sensorVibracion.id].sort());
  });

  it("rechaza una máquina que no existe", async () => {
    const deps = construir();

    await expect(
      consultarSensores(deps, {
        usuario: supervisor,
        maquinaId: "no-existe",
        agregacion: "avg",
        bucket: "1d",
        desde: HACE_UNA_SEMANA,
        hasta: AHORA,
      }),
    ).rejects.toThrow(MaquinaNoEncontrada);
  });

  it("un operador no puede consultar sensores de una máquina fuera de su área", async () => {
    const deps = construir();

    await expect(
      consultarSensores(deps, {
        usuario: operadorEnsamble,
        maquinaId: torno.id,
        agregacion: "avg",
        bucket: "1d",
        desde: HACE_UNA_SEMANA,
        hasta: AHORA,
      }),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("un supervisor puede consultar cualquier máquina", async () => {
    const deps = construir();

    const series = await consultarSensores(deps, {
      usuario: supervisor,
      maquinaId: torno.id,
      agregacion: "avg",
      bucket: "1d",
      desde: HACE_UNA_SEMANA,
      hasta: AHORA,
    });

    expect(series).toEqual([]);
  });

  it("rechaza un rango de más de 90 días", async () => {
    const deps = construir();
    const desde = new Date("2025-01-01T00:00:00.000Z");

    await expect(
      consultarSensores(deps, {
        usuario: supervisor,
        maquinaId: prensa.id,
        agregacion: "avg",
        bucket: "1d",
        desde,
        hasta: AHORA,
      }),
    ).rejects.toThrow(RangoConsultaDemasiadoAmplio);
  });

  it("rechaza un sensorId que no pertenece a la máquina indicada", async () => {
    const deps = construir();

    await expect(
      consultarSensores(deps, {
        usuario: supervisor,
        maquinaId: torno.id,
        sensorId: sensorTemp.id,
        agregacion: "avg",
        bucket: "1d",
        desde: HACE_UNA_SEMANA,
        hasta: AHORA,
      }),
    ).rejects.toThrow(SensorNoEncontrado);
  });
});
