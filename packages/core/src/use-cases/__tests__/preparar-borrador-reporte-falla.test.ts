import { describe, expect, it } from "vitest";
import { prepararBorradorReporteFalla } from "../preparar-borrador-reporte-falla";
import { MaquinaFueraDeArea } from "../../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../../errors/maquina-no-encontrada";
import { SintomaRequerido } from "../../errors/sintoma-requerido";
import { DemasiadasFotos } from "../../errors/demasiadas-fotos";
import type { Maquina } from "../../entities/maquina";
import type { Usuario } from "../../entities/usuario";
import { crearRepositorioAreasUsuarioFalso, crearRepositorioMaquinasFalso } from "../../testing/fakes";

const prensa: Maquina = { id: "maquina-1", areaId: "area-ensamble", nombre: "Prensa" };
const torno: Maquina = { id: "maquina-2", areaId: "area-maquinado", nombre: "Torno CNC" };

const operadorEnsamble: Usuario = {
  id: "usuario-op",
  email: "operador@planta.mx",
  passwordHash: "hash:x",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

function construir() {
  return {
    maquinas: crearRepositorioMaquinasFalso([prensa, torno]),
    areasUsuario: crearRepositorioAreasUsuarioFalso({ [operadorEnsamble.id]: ["area-ensamble"] }),
  };
}

describe("prepararBorradorReporteFalla", () => {
  it("valida y arma el borrador, sin persistir nada", async () => {
    const deps = construir();

    const borrador = await prepararBorradorReporteFalla(deps, {
      usuario: operadorEnsamble,
      machineId: prensa.id,
      sintomaTaxonomia: "vibracion_excesiva",
      descripcion: "vibra más de lo normal",
      severidad: 2,
      fotos: [],
    });

    expect(borrador).toEqual({
      machineId: prensa.id,
      areaId: prensa.areaId,
      sintomaTaxonomia: "vibracion_excesiva",
      sintomaOtro: null,
      descripcion: "vibra más de lo normal",
      severidad: 2,
      fotos: [],
    });
  });

  it("rechaza si no hay síntoma", async () => {
    const deps = construir();
    await expect(
      prepararBorradorReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: prensa.id,
        descripcion: "algo pasó",
        severidad: 1,
        fotos: [],
      }),
    ).rejects.toThrow(SintomaRequerido);
  });

  it("rechaza una máquina que no existe", async () => {
    const deps = construir();
    await expect(
      prepararBorradorReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: "no-existe",
        sintomaTaxonomia: "fuga",
        descripcion: "x",
        severidad: 1,
        fotos: [],
      }),
    ).rejects.toThrow(MaquinaNoEncontrada);
  });

  it("un operador no puede armar un borrador para una máquina fuera de su área", async () => {
    const deps = construir();
    await expect(
      prepararBorradorReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: torno.id,
        sintomaTaxonomia: "no_enciende",
        descripcion: "no prende",
        severidad: 3,
        fotos: [],
      }),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("rechaza más de 5 fotos", async () => {
    const deps = construir();
    await expect(
      prepararBorradorReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: prensa.id,
        sintomaTaxonomia: "fuga",
        descripcion: "x",
        severidad: 1,
        fotos: ["a", "b", "c", "d", "e", "f"],
      }),
    ).rejects.toThrow(DemasiadasFotos);
  });
});
