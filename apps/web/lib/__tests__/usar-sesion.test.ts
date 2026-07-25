import { describe, expect, it } from "vitest";
import { rutaInicioPorRol } from "../usar-sesion";

describe("rutaInicioPorRol", () => {
  it("operador aterriza en /chat (spec 02-interfaz: chat de pantalla completa)", () => {
    expect(rutaInicioPorRol("operador")).toBe("/chat");
  });

  it("supervisor aterriza en /bandeja (spec 02-interfaz: bandeja de pendientes de aprobación)", () => {
    expect(rutaInicioPorRol("supervisor")).toBe("/bandeja");
  });

  it("admin aterriza en /documentos", () => {
    expect(rutaInicioPorRol("admin")).toBe("/documentos");
  });
});
