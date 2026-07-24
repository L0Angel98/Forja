import { describe, expect, it, vi } from "vitest";
import type { HerramientaConectorManifiesto } from "../../entities/conector";
import { construirHerramientaConector } from "../construir-herramienta-conector";

const CTX = { usuario: { id: "u1", email: "a@b.com", passwordHash: "x", nombre: "A", rol: "operador" as const, activo: true }, plantId: "p1", traceId: "t1" };

function herramientaCruda(overrides: Partial<HerramientaConectorManifiesto> = {}): HerramientaConectorManifiesto {
  return {
    nombre: "crear_evento",
    descripcion: "Crea un evento.",
    esEscritura: true,
    schemaEntrada: { type: "object" },
    ...overrides,
  };
}

describe("construirHerramientaConector", () => {
  it("una herramienta de escritura nunca invoca al cliente MCP: solo devuelve un borrador", async () => {
    const invocar = vi.fn();
    const herramienta = construirHerramientaConector("google-calendar", herramientaCruda(), ["supervisor", "admin"], {
      invocar,
    });

    const resultado = await herramienta.execute({ titulo: "Mantenimiento" }, CTX);

    expect(invocar).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      conector: "google-calendar",
      herramienta: "crear_evento",
      parametros: { titulo: "Mantenimiento" },
    });
  });

  it("una herramienta de lectura invoca al cliente MCP de verdad y devuelve su resultado", async () => {
    const invocar = vi.fn().mockResolvedValue("disponible de 9 a 11");
    const herramienta = construirHerramientaConector(
      "google-calendar",
      herramientaCruda({ nombre: "consultar_disponibilidad", esEscritura: false }),
      ["operador", "supervisor", "admin"],
      { invocar },
    );

    const resultado = await herramienta.execute({ dia: "2026-08-01" }, CTX);

    expect(invocar).toHaveBeenCalledWith("consultar_disponibilidad", { dia: "2026-08-01" });
    expect(resultado).toBe("disponible de 9 a 11");
  });

  it("marca soloLectura: true en ambos casos (spec 16: seguro para rutinas por construcción)", () => {
    const escritura = construirHerramientaConector("x", herramientaCruda({ esEscritura: true }), [], {
      invocar: vi.fn(),
    });
    const lectura = construirHerramientaConector("x", herramientaCruda({ esEscritura: false }), [], {
      invocar: vi.fn(),
    });

    expect(escritura.soloLectura).toBe(true);
    expect(lectura.soloLectura).toBe(true);
  });

  it("propaga nombre, descripcion y rolesPermitidos", () => {
    const herramienta = construirHerramientaConector("webhook", herramientaCruda({ nombre: "llamar_webhook" }), [
      "admin",
    ], { invocar: vi.fn() });

    expect(herramienta.nombre).toBe("llamar_webhook");
    expect(herramienta.rolesPermitidos).toEqual(["admin"]);
  });
});
