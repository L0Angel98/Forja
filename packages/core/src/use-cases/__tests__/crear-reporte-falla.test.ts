import { describe, expect, it } from "vitest";
import { crearReporteFalla } from "../crear-reporte-falla";
import { MaquinaFueraDeArea } from "../../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../../errors/maquina-no-encontrada";
import { SintomaRequerido } from "../../errors/sintoma-requerido";
import { DemasiadasFotos } from "../../errors/demasiadas-fotos";
import { EVENTO_FALLA_REPORTADA } from "../../events/falla-reportada";
import { BusEventos } from "../../events/bus-eventos";
import type { Maquina } from "../../entities/maquina";
import type { Usuario } from "../../entities/usuario";
import {
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioFallasFalso,
  crearRepositorioMaquinasFalso,
} from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");

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
    fallas: crearRepositorioFallasFalso(),
    bus: new BusEventos(),
    generarId: () => "reporte-1",
  };
}

describe("crearReporteFalla", () => {
  it("crea el reporte con síntoma de taxonomía y publica FallaReportada", async () => {
    const deps = construir();
    const eventosRecibidos: unknown[] = [];
    deps.bus.suscribir(EVENTO_FALLA_REPORTADA, (e) => {
      eventosRecibidos.push(e);
    });

    const reporte = await crearReporteFalla(deps, {
      usuario: operadorEnsamble,
      machineId: prensa.id,
      sintomaTaxonomia: "vibracion_excesiva",
      descripcion: "La prensa vibra más de lo normal desde esta mañana",
      severidad: 2,
      fotos: [],
      origen: "agente",
      ahora: AHORA,
    });

    expect(reporte.estado).toBe("abierto");
    expect(reporte.id).toBe("reporte-1");
    expect(deps.fallas.fallas.get("reporte-1")).toEqual(reporte);
    expect(eventosRecibidos).toEqual([
      { failureReportId: "reporte-1", machineId: prensa.id, areaId: prensa.areaId, ocurridoEn: AHORA },
    ]);
  });

  it("acepta síntoma fuera de taxonomía en sintomaOtro", async () => {
    const deps = construir();
    const reporte = await crearReporteFalla(deps, {
      usuario: operadorEnsamble,
      machineId: prensa.id,
      sintomaOtro: "huele a quemado, no está en la lista",
      descripcion: "Huele a quemado",
      severidad: 4,
      fotos: [],
      origen: "formulario",
      ahora: AHORA,
    });

    expect(reporte.sintomaTaxonomia).toBeNull();
    expect(reporte.sintomaOtro).toBe("huele a quemado, no está en la lista");
  });

  it("rechaza si no hay síntoma de taxonomía ni sintomaOtro", async () => {
    const deps = construir();
    await expect(
      crearReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: prensa.id,
        descripcion: "algo pasó",
        severidad: 1,
        fotos: [],
        origen: "formulario",
        ahora: AHORA,
      }),
    ).rejects.toThrow(SintomaRequerido);
  });

  it("rechaza una máquina que no existe", async () => {
    const deps = construir();
    await expect(
      crearReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: "no-existe",
        sintomaTaxonomia: "fuga",
        descripcion: "x",
        severidad: 1,
        fotos: [],
        origen: "formulario",
        ahora: AHORA,
      }),
    ).rejects.toThrow(MaquinaNoEncontrada);
  });

  it("un operador no puede reportar sobre una máquina fuera de su área", async () => {
    const deps = construir();
    await expect(
      crearReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: torno.id,
        sintomaTaxonomia: "no_enciende",
        descripcion: "no prende",
        severidad: 3,
        fotos: [],
        origen: "formulario",
        ahora: AHORA,
      }),
    ).rejects.toThrow(MaquinaFueraDeArea);
  });

  it("un supervisor puede reportar sobre cualquier máquina (ve todas las áreas)", async () => {
    const deps = construir();
    const reporte = await crearReporteFalla(deps, {
      usuario: supervisor,
      machineId: torno.id,
      sintomaTaxonomia: "no_enciende",
      descripcion: "no prende",
      severidad: 3,
      fotos: [],
      origen: "formulario",
      ahora: AHORA,
    });
    expect(reporte.machineId).toBe(torno.id);
  });

  it("rechaza más de 5 fotos", async () => {
    const deps = construir();
    await expect(
      crearReporteFalla(deps, {
        usuario: operadorEnsamble,
        machineId: prensa.id,
        sintomaTaxonomia: "fuga",
        descripcion: "x",
        severidad: 1,
        fotos: ["a", "b", "c", "d", "e", "f"],
        origen: "formulario",
        ahora: AHORA,
      }),
    ).rejects.toThrow(DemasiadasFotos);
  });
});
