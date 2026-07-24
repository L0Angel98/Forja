import type { Herramienta } from "@forja/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { RegistroHerramientas } from "../registro-herramientas";

function herramientaDePrueba(datos: Partial<Herramienta> & Pick<Herramienta, "nombre" | "rolesPermitidos">): Herramienta {
  return {
    descripcion: "herramienta de prueba",
    soloLectura: false,
    schema: z.object({}),
    async execute() {
      return null;
    },
    ...datos,
  };
}

describe("RegistroHerramientas", () => {
  it("expone a un operador solo las herramientas permitidas para su rol", () => {
    const registro = new RegistroHerramientas();
    registro.registrar(
      herramientaDePrueba({
        nombre: "consultar_fallas",
        descripcion: "Consulta fallas reportadas.",
        rolesPermitidos: ["operador", "supervisor", "admin"],
      }),
    );
    registro.registrar(
      herramientaDePrueba({
        nombre: "aprobar_borrador_orden",
        descripcion: "Aprueba un borrador de orden de mantenimiento.",
        rolesPermitidos: ["supervisor", "admin"],
      }),
    );

    const herramientasOperador = registro.disponiblesPara("operador").map((h) => h.nombre);
    const herramientasSupervisor = registro.disponiblesPara("supervisor").map((h) => h.nombre);

    expect(herramientasOperador).toEqual(["consultar_fallas"]);
    expect(herramientasSupervisor).toEqual(
      expect.arrayContaining(["consultar_fallas", "aprobar_borrador_orden"]),
    );
  });

  it("rechaza registrar dos herramientas con el mismo nombre", () => {
    const registro = new RegistroHerramientas();
    registro.registrar(herramientaDePrueba({ nombre: "x", rolesPermitidos: ["admin"] }));

    expect(() =>
      registro.registrar(herramientaDePrueba({ nombre: "x", rolesPermitidos: ["operador"] })),
    ).toThrow();
  });

  it("un registro vacío no expone herramientas a ningún rol", () => {
    const registro = new RegistroHerramientas();
    expect(registro.disponiblesPara("admin")).toEqual([]);
  });

  describe("buscarDisponiblePara", () => {
    it("devuelve la herramienta si el rol tiene acceso", () => {
      const registro = new RegistroHerramientas();
      registro.registrar(herramientaDePrueba({ nombre: "consultar_fallas", rolesPermitidos: ["operador"] }));

      expect(registro.buscarDisponiblePara("consultar_fallas", "operador")?.nombre).toBe("consultar_fallas");
    });

    it("devuelve undefined si el rol no tiene acceso", () => {
      const registro = new RegistroHerramientas();
      registro.registrar(herramientaDePrueba({ nombre: "aprobar_borrador_orden", rolesPermitidos: ["supervisor"] }));

      expect(registro.buscarDisponiblePara("aprobar_borrador_orden", "operador")).toBeUndefined();
    });

    it("devuelve undefined si la herramienta no existe", () => {
      const registro = new RegistroHerramientas();
      expect(registro.buscarDisponiblePara("no-existe", "admin")).toBeUndefined();
    });
  });

  describe("existe / esSoloLectura (puerto CatalogoHerramientas)", () => {
    it("existe() es true solo para herramientas registradas", () => {
      const registro = new RegistroHerramientas();
      registro.registrar(herramientaDePrueba({ nombre: "consultar_fallas", rolesPermitidos: ["admin"] }));

      expect(registro.existe("consultar_fallas")).toBe(true);
      expect(registro.existe("no-existe")).toBe(false);
    });

    it("esSoloLectura() refleja el campo soloLectura de la herramienta, false si no existe", () => {
      const registro = new RegistroHerramientas();
      registro.registrar(herramientaDePrueba({ nombre: "lectura", rolesPermitidos: ["admin"], soloLectura: true }));
      registro.registrar(herramientaDePrueba({ nombre: "escritura", rolesPermitidos: ["admin"], soloLectura: false }));

      expect(registro.esSoloLectura("lectura")).toBe(true);
      expect(registro.esSoloLectura("escritura")).toBe(false);
      expect(registro.esSoloLectura("no-existe")).toBe(false);
    });
  });

  describe("disponiblesParaRutina", () => {
    it("por construcción nunca expone una herramienta de escritura, aunque se pida por nombre", () => {
      const registro = new RegistroHerramientas();
      registro.registrar(herramientaDePrueba({ nombre: "lectura", rolesPermitidos: ["admin"], soloLectura: true }));
      registro.registrar(herramientaDePrueba({ nombre: "escritura", rolesPermitidos: ["admin"], soloLectura: false }));

      const resultado = registro.disponiblesParaRutina(["lectura", "escritura", "no-existe"]);

      expect(resultado.map((h) => h.nombre)).toEqual(["lectura"]);
    });
  });

  describe("RegistroHerramientas.desde", () => {
    it("construye un registry acotado exactamente a las herramientas dadas", () => {
      const original = new RegistroHerramientas();
      const lectura = herramientaDePrueba({ nombre: "lectura", rolesPermitidos: ["admin"], soloLectura: true });
      original.registrar(lectura);
      original.registrar(herramientaDePrueba({ nombre: "escritura", rolesPermitidos: ["admin"], soloLectura: false }));

      const acotado = RegistroHerramientas.desde(original.disponiblesParaRutina(["lectura", "escritura"]));

      expect(acotado.disponiblesPara("admin").map((h) => h.nombre)).toEqual(["lectura"]);
      expect(acotado.buscarDisponiblePara("escritura", "admin")).toBeUndefined();
    });
  });
});
