import { describe, expect, it } from "vitest";
import { listarSensoresMudos } from "../listar-sensores-mudos";
import { MaquinaFueraDeArea } from "../../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../../errors/maquina-no-encontrada";
import type { Maquina } from "../../entities/maquina";
import type { SensorCatalogo } from "../../entities/sensor-catalogo";
import type { Usuario } from "../../entities/usuario";
import {
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioLecturasFalso,
  crearRepositorioMaquinasFalso,
} from "../../testing/fakes";

const AHORA = new Date("2026-01-01T12:00:00.000Z");

const maquinaEnsamble: Maquina = { id: "maquina-1", areaId: "area-ensamble", nombre: "Prensa" };
const maquinaMaquinado: Maquina = { id: "maquina-2", areaId: "area-maquinado", nombre: "Torno CNC" };

const sensorActivo: SensorCatalogo = {
  id: "sensor-activo",
  externalId: "activo",
  machineId: maquinaEnsamble.id,
  nombre: "Activo",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};
const sensorMudo: SensorCatalogo = {
  id: "sensor-mudo",
  externalId: "mudo",
  machineId: maquinaEnsamble.id,
  nombre: "Mudo",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};
const sensorSinLecturas: SensorCatalogo = {
  id: "sensor-sin-lecturas",
  externalId: "sin-lecturas",
  machineId: maquinaMaquinado.id,
  nombre: "Sin lecturas",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
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
  const lecturas = crearRepositorioLecturasFalso();
  lecturas.lecturas.push(
    { sensorId: sensorActivo.id, ts: new Date("2026-01-01T11:55:00.000Z"), value: 1, fueraDeRango: false },
    { sensorId: sensorMudo.id, ts: new Date("2026-01-01T10:00:00.000Z"), value: 1, fueraDeRango: false },
  );
  return {
    catalogo: crearRepositorioCatalogoSensoresFalso([sensorActivo, sensorMudo, sensorSinLecturas]),
    lecturas,
    maquinas: crearRepositorioMaquinasFalso([maquinaEnsamble, maquinaMaquinado]),
    areasUsuario: crearRepositorioAreasUsuarioFalso({ [operadorEnsamble.id]: ["area-ensamble"] }),
  };
}

describe("listarSensoresMudos", () => {
  it("un sensor sin lecturas recientes (>mudoTrasMinutos) aparece como mudo", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { usuario: supervisor, ahora: AHORA });

    const idsMudos = mudos.map((m) => m.sensorId);
    expect(idsMudos).toContain(sensorMudo.id);
    expect(idsMudos).not.toContain(sensorActivo.id);
  });

  it("un sensor que nunca tuvo lecturas aparece como mudo con minutosSinLectura null", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { usuario: supervisor, ahora: AHORA });

    const entrada = mudos.find((m) => m.sensorId === sensorSinLecturas.id);
    expect(entrada?.minutosSinLectura).toBeNull();
  });

  it("filtra por máquina cuando se da maquinaId", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, {
      usuario: supervisor,
      ahora: AHORA,
      maquinaId: maquinaMaquinado.id,
    });

    expect(mudos.map((m) => m.sensorId)).toEqual([sensorSinLecturas.id]);
  });

  it("rechaza una máquina que no existe", async () => {
    const deps = construir();

    await expect(
      listarSensoresMudos(deps, { usuario: supervisor, ahora: AHORA, maquinaId: "no-existe" }),
    ).rejects.toThrow(MaquinaNoEncontrada);
  });

  it("un operador no puede pedir el estado de una máquina fuera de su área", async () => {
    const deps = construir();

    await expect(
      listarSensoresMudos(deps, { usuario: operadorEnsamble, ahora: AHORA, maquinaId: maquinaMaquinado.id }),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("un operador sin maquinaId solo ve sensores de sus áreas asignadas", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { usuario: operadorEnsamble, ahora: AHORA });

    expect(mudos.map((m) => m.sensorId)).toEqual([sensorMudo.id]);
  });

  it("un supervisor sin maquinaId ve sensores de todas las máquinas", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { usuario: supervisor, ahora: AHORA });

    expect(mudos.map((m) => m.sensorId).sort()).toEqual([sensorMudo.id, sensorSinLecturas.id].sort());
  });
});
