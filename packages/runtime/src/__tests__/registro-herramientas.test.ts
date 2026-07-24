import { describe, expect, it } from "vitest";
import { RegistroHerramientas } from "../registro-herramientas";

describe("RegistroHerramientas", () => {
  it("expone a un operador solo las herramientas permitidas para su rol", () => {
    const registro = new RegistroHerramientas();
    registro.registrar({
      nombre: "consultar_fallas",
      descripcion: "Consulta fallas reportadas.",
      rolesPermitidos: ["operador", "supervisor", "admin"],
    });
    registro.registrar({
      nombre: "aprobar_borrador_orden",
      descripcion: "Aprueba un borrador de orden de mantenimiento.",
      rolesPermitidos: ["supervisor", "admin"],
    });

    const herramientasOperador = registro.disponiblesPara("operador").map((h) => h.nombre);
    const herramientasSupervisor = registro.disponiblesPara("supervisor").map((h) => h.nombre);

    expect(herramientasOperador).toEqual(["consultar_fallas"]);
    expect(herramientasSupervisor).toEqual(
      expect.arrayContaining(["consultar_fallas", "aprobar_borrador_orden"]),
    );
  });

  it("rechaza registrar dos herramientas con el mismo nombre", () => {
    const registro = new RegistroHerramientas();
    registro.registrar({ nombre: "x", descripcion: "d", rolesPermitidos: ["admin"] });

    expect(() =>
      registro.registrar({ nombre: "x", descripcion: "otra", rolesPermitidos: ["operador"] }),
    ).toThrow();
  });

  it("un registro vacío no expone herramientas a ningún rol", () => {
    const registro = new RegistroHerramientas();
    expect(registro.disponiblesPara("admin")).toEqual([]);
  });
});
