import {
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioMaquinasFalso,
  MaquinaFueraDeArea,
  type Maquina,
  type Usuario,
} from "@forja/core";
import { describe, expect, it } from "vitest";
import { crearHerramientaCrearReporteFalla } from "../crear-reporte-falla";

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

function construirHerramienta() {
  return crearHerramientaCrearReporteFalla({
    maquinas: crearRepositorioMaquinasFalso([prensa, torno]),
    areasUsuario: crearRepositorioAreasUsuarioFalso({ [operadorEnsamble.id]: ["area-ensamble"] }),
  });
}

describe("herramienta crear_reporte_falla", () => {
  it("arma un borrador validado sin persistir nada", async () => {
    const herramienta = construirHerramienta();

    const borrador = await herramienta.execute(
      {
        machineId: prensa.id,
        sintomaTaxonomia: "vibracion_excesiva",
        descripcion: "La prensa vibra más de lo normal",
        severidad: 2,
        fotos: [],
      },
      { usuario: operadorEnsamble, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(borrador).toEqual({
      machineId: prensa.id,
      areaId: prensa.areaId,
      sintomaTaxonomia: "vibracion_excesiva",
      sintomaOtro: null,
      descripcion: "La prensa vibra más de lo normal",
      severidad: 2,
      fotos: [],
    });
  });

  it("propaga el error de dominio si la máquina está fuera del área del operador", async () => {
    const herramienta = construirHerramienta();

    await expect(
      herramienta.execute(
        {
          machineId: torno.id,
          sintomaTaxonomia: "no_enciende",
          descripcion: "no prende",
          severidad: 3,
          fotos: [],
        },
        { usuario: operadorEnsamble, plantId: "planta-1", traceId: "trace-1" },
      ),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("valida con Zod: rechaza un síntoma fuera de la taxonomía cerrada", () => {
    const herramienta = construirHerramienta();
    const parseo = herramienta.schema.safeParse({
      machineId: prensa.id,
      sintomaTaxonomia: "no_existe_en_la_taxonomia",
      descripcion: "x",
      severidad: 1,
      fotos: [],
    });
    expect(parseo.success).toBe(false);
  });

  it("valida con Zod: rechaza más de 5 fotos", () => {
    const herramienta = construirHerramienta();
    const parseo = herramienta.schema.safeParse({
      machineId: prensa.id,
      sintomaTaxonomia: "fuga",
      descripcion: "x",
      severidad: 1,
      fotos: ["a", "b", "c", "d", "e", "f"],
    });
    expect(parseo.success).toBe(false);
  });

  it("valida con Zod: rechaza severidad fuera de 1-4", () => {
    const herramienta = construirHerramienta();
    const parseo = herramienta.schema.safeParse({
      machineId: prensa.id,
      sintomaTaxonomia: "fuga",
      descripcion: "x",
      severidad: 5,
      fotos: [],
    });
    expect(parseo.success).toBe(false);
  });

  it("está disponible para los tres roles", () => {
    const herramienta = construirHerramienta();
    expect(herramienta.rolesPermitidos).toEqual(["operador", "supervisor", "admin"]);
  });
});
