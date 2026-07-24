import { crearRepositorioSugerenciasMemoriaFalso, type Usuario } from "@forja/core";
import { describe, expect, it } from "vitest";
import { crearHerramientaProponerMemoria } from "../proponer-memoria";

const usuario: Usuario = {
  id: "usuario-1",
  email: "operador@planta.mx",
  passwordHash: "hash:x",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

describe("herramienta proponer_memoria", () => {
  it("crea una sugerencia pendiente y la deja disponible para el admin", async () => {
    const sugerencias = crearRepositorioSugerenciasMemoriaFalso();
    const herramienta = crearHerramientaProponerMemoria({ sugerencias, generarId: () => "sugerencia-1" });

    const resultado = await herramienta.execute(
      { contenido: "El torno 3 vibra más los lunes" },
      { usuario, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado).toEqual({ id: "sugerencia-1" });
    expect(await sugerencias.buscarPorId("sugerencia-1")).toMatchObject({
      contenido: "El torno 3 vibra más los lunes",
      estado: "pendiente",
    });
  });

  it("valida el contenido con Zod (vacío inválido)", () => {
    const parseo = crearHerramientaProponerMemoria({
      sugerencias: crearRepositorioSugerenciasMemoriaFalso(),
      generarId: () => "x",
    }).schema.safeParse({ contenido: "" });

    expect(parseo.success).toBe(false);
  });

  it("está disponible para los tres roles", () => {
    const herramienta = crearHerramientaProponerMemoria({
      sugerencias: crearRepositorioSugerenciasMemoriaFalso(),
      generarId: () => "x",
    });
    expect(herramienta.rolesPermitidos).toEqual(["operador", "supervisor", "admin"]);
  });
});
