import {
  crearRepositorioAgregacionesSensoresFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioMaquinasFalso,
  MaquinaFueraDeArea,
  type Maquina,
  type SensorCatalogo,
  type Usuario,
} from "@forja/core";
import { describe, expect, it } from "vitest";
import { crearHerramientaConsultarSensores } from "../consultar-sensores";

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
  const catalogo = crearRepositorioCatalogoSensoresFalso([sensorTemp]);
  const agregaciones = crearRepositorioAgregacionesSensoresFalso([
    { sensorId: sensorTemp.id, ts: new Date("2026-01-02T00:00:00.000Z"), value: 60, fueraDeRango: false },
    { sensorId: sensorTemp.id, ts: new Date("2026-01-03T00:00:00.000Z"), value: 70, fueraDeRango: false },
  ]);

  return crearHerramientaConsultarSensores({ maquinas, areasUsuario, catalogo, agregaciones });
}

describe("herramienta consultar_sensores", () => {
  it("devuelve la serie agregada de un sensor dentro del rango pedido", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      {
        maquinaId: prensa.id,
        sensorId: sensorTemp.id,
        agregacion: "avg",
        bucket: "1d",
        desde: "2026-01-01T00:00:00.000Z",
        hasta: "2026-01-08T00:00:00.000Z",
      },
      { usuario: supervisor, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.series).toHaveLength(1);
    expect(resultado.series[0]?.sensorId).toBe(sensorTemp.id);
    expect(resultado.series[0]?.puntos.length).toBeGreaterThan(0);
  });

  it("un operador no puede consultar una máquina fuera de su área", async () => {
    const herramienta = construirHerramienta();

    await expect(
      herramienta.execute(
        {
          maquinaId: torno.id,
          agregacion: "avg",
          bucket: "1d",
          desde: "2026-01-01T00:00:00.000Z",
          hasta: "2026-01-08T00:00:00.000Z",
        },
        { usuario: operadorEnsamble, plantId: "planta-1", traceId: "trace-1" },
      ),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("valida el schema: rechaza agregación o bucket fuera del enum cerrado", () => {
    const herramienta = construirHerramienta();

    const invalido = herramienta.schema.safeParse({
      maquinaId: prensa.id,
      agregacion: "sum",
      bucket: "1d",
      desde: "2026-01-01T00:00:00.000Z",
      hasta: "2026-01-08T00:00:00.000Z",
    });

    expect(invalido.success).toBe(false);
  });

  it("valida el schema: rechaza fechas que no son ISO datetime", () => {
    const herramienta = construirHerramienta();

    const invalido = herramienta.schema.safeParse({
      maquinaId: prensa.id,
      agregacion: "avg",
      bucket: "1d",
      desde: "hace una semana",
      hasta: "2026-01-08T00:00:00.000Z",
    });

    expect(invalido.success).toBe(false);
  });

  it("está disponible para los tres roles", () => {
    const herramienta = construirHerramienta();
    expect(herramienta.rolesPermitidos).toEqual(["operador", "supervisor", "admin"]);
  });
});
