import {
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioLecturasFalso,
  crearRepositorioMaquinasFalso,
  MaquinaFueraDeArea,
  type Maquina,
  type SensorCatalogo,
  type Usuario,
} from "@forja/core";
import { describe, expect, it } from "vitest";
import { crearHerramientaConsultarEstadoSensores } from "../consultar-estado-sensores";

const prensa: Maquina = { id: "maquina-1", areaId: "area-ensamble", nombre: "Prensa" };
const torno: Maquina = { id: "maquina-2", areaId: "area-maquinado", nombre: "Torno CNC" };

const sensorMudo: SensorCatalogo = {
  id: "sensor-mudo",
  externalId: "mudo",
  machineId: prensa.id,
  nombre: "Mudo",
  unidad: "C",
  rangoMin: 0,
  rangoMax: 100,
  mudoTrasMinutos: 60,
};
const sensorMudoTorno: SensorCatalogo = {
  id: "sensor-mudo-torno",
  externalId: "mudo-torno",
  machineId: torno.id,
  nombre: "Mudo torno",
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

function construirHerramienta() {
  const maquinas = crearRepositorioMaquinasFalso([prensa, torno]);
  const areasUsuario = crearRepositorioAreasUsuarioFalso({ [operadorEnsamble.id]: ["area-ensamble"] });
  const catalogo = crearRepositorioCatalogoSensoresFalso([sensorMudo, sensorMudoTorno]);
  const lecturas = crearRepositorioLecturasFalso();

  return crearHerramientaConsultarEstadoSensores({ maquinas, areasUsuario, catalogo, lecturas });
}

describe("herramienta consultar_estado_sensores", () => {
  it("lista sensores mudos de una máquina", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      { maquinaId: prensa.id },
      { usuario: supervisor, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.sensoresMudos.map((s) => s.sensorId)).toEqual([sensorMudo.id]);
  });

  it("un operador sin maquinaId solo ve sensores de sus áreas asignadas", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      {},
      { usuario: operadorEnsamble, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.sensoresMudos.map((s) => s.sensorId)).toEqual([sensorMudo.id]);
  });

  it("un operador no puede pedir el estado de una máquina fuera de su área", async () => {
    const herramienta = construirHerramienta();

    await expect(
      herramienta.execute(
        { maquinaId: torno.id },
        { usuario: operadorEnsamble, plantId: "planta-1", traceId: "trace-1" },
      ),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("un supervisor sin maquinaId ve sensores mudos de todas las máquinas", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      {},
      { usuario: supervisor, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.sensoresMudos.map((s) => s.sensorId).sort()).toEqual(
      [sensorMudo.id, sensorMudoTorno.id].sort(),
    );
  });

  it("está disponible para los tres roles", () => {
    const herramienta = construirHerramienta();
    expect(herramienta.rolesPermitidos).toEqual(["operador", "supervisor", "admin"]);
  });
});
