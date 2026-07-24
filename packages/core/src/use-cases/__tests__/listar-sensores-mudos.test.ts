import { describe, expect, it } from "vitest";
import { listarSensoresMudos } from "../listar-sensores-mudos";
import type { SensorCatalogo } from "../../entities/sensor-catalogo";
import { crearRepositorioCatalogoSensoresFalso, crearRepositorioLecturasFalso } from "../../testing/fakes";

const AHORA = new Date("2026-01-01T12:00:00.000Z");

const sensorActivo: SensorCatalogo = {
  id: "sensor-activo",
  externalId: "activo",
  machineId: "maquina-1",
  nombre: "Activo",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};
const sensorMudo: SensorCatalogo = {
  id: "sensor-mudo",
  externalId: "mudo",
  machineId: "maquina-1",
  nombre: "Mudo",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};
const sensorSinLecturas: SensorCatalogo = {
  id: "sensor-sin-lecturas",
  externalId: "sin-lecturas",
  machineId: "maquina-2",
  nombre: "Sin lecturas",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};

function construir() {
  const catalogo = crearRepositorioCatalogoSensoresFalso([sensorActivo, sensorMudo, sensorSinLecturas]);
  const lecturas = crearRepositorioLecturasFalso();
  lecturas.lecturas.push(
    { sensorId: sensorActivo.id, ts: new Date("2026-01-01T11:55:00.000Z"), value: 1, fueraDeRango: false },
    { sensorId: sensorMudo.id, ts: new Date("2026-01-01T10:00:00.000Z"), value: 1, fueraDeRango: false },
  );
  return { catalogo, lecturas };
}

describe("listarSensoresMudos", () => {
  it("un sensor sin lecturas recientes (>mudoTrasMinutos) aparece como mudo", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { ahora: AHORA });

    const idsMudos = mudos.map((m) => m.sensorId);
    expect(idsMudos).toContain(sensorMudo.id);
    expect(idsMudos).not.toContain(sensorActivo.id);
  });

  it("un sensor que nunca tuvo lecturas aparece como mudo con minutosSinLectura null", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { ahora: AHORA });

    const entrada = mudos.find((m) => m.sensorId === sensorSinLecturas.id);
    expect(entrada?.minutosSinLectura).toBeNull();
  });

  it("filtra por máquina cuando se da maquinaId", async () => {
    const deps = construir();

    const mudos = await listarSensoresMudos(deps, { ahora: AHORA, maquinaId: "maquina-2" });

    expect(mudos.map((m) => m.sensorId)).toEqual([sensorSinLecturas.id]);
  });
});
