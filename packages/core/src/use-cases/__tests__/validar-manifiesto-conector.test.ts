import { describe, expect, it } from "vitest";
import { ManifiestoConectorInvalido } from "../../errors/manifiesto-conector-invalido";
import { validarManifiestoConector } from "../validar-manifiesto-conector";

describe("validarManifiestoConector", () => {
  it("construye el manifiesto a partir de la respuesta cruda de tools/list", () => {
    const manifiesto = validarManifiestoConector("google-calendar", "1.0.0", [
      {
        name: "crear_evento",
        description: "Crea un evento en el calendario.",
        inputSchema: { type: "object", properties: { titulo: { type: "string" } } },
        annotations: { readOnlyHint: false },
      },
      {
        name: "consultar_disponibilidad",
        description: "Consulta disponibilidad.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
      },
    ]);

    expect(manifiesto).toEqual({
      nombre: "google-calendar",
      version: "1.0.0",
      herramientas: [
        {
          nombre: "crear_evento",
          descripcion: "Crea un evento en el calendario.",
          esEscritura: true,
          schemaEntrada: { type: "object", properties: { titulo: { type: "string" } } },
        },
        {
          nombre: "consultar_disponibilidad",
          descripcion: "Consulta disponibilidad.",
          esEscritura: false,
          schemaEntrada: { type: "object", properties: {} },
        },
      ],
    });
  });

  it("sin annotations.readOnlyHint, asume esEscritura: true (postura segura por defecto)", () => {
    const manifiesto = validarManifiestoConector("webhook", "1.0.0", [
      { name: "llamar_webhook", description: "Llama a un webhook.", inputSchema: { type: "object" } },
    ]);

    expect(manifiesto.herramientas[0]?.esEscritura).toBe(true);
  });

  it("permite un manifiesto sin herramientas", () => {
    const manifiesto = validarManifiestoConector("vacio", "1.0.0", []);
    expect(manifiesto.herramientas).toEqual([]);
  });

  it.each([
    ["falta name", [{ description: "x", inputSchema: {} }]],
    ["falta description", [{ name: "x", inputSchema: {} }]],
    ["falta inputSchema", [{ name: "x", description: "x" }]],
    ["inputSchema no es objeto", [{ name: "x", description: "x", inputSchema: "no-es-objeto" }]],
    ["name vacío", [{ name: "", description: "x", inputSchema: {} }]],
  ])("rechaza una herramienta cruda inválida: %s", (_caso, herramientasCrudas) => {
    expect(() => validarManifiestoConector("conector", "1.0.0", herramientasCrudas)).toThrow(
      ManifiestoConectorInvalido,
    );
  });

  it("rechaza herramientas duplicadas dentro del mismo manifiesto", () => {
    const herramientasCrudas = [
      { name: "x", description: "primera", inputSchema: {} },
      { name: "x", description: "segunda", inputSchema: {} },
    ];

    expect(() => validarManifiestoConector("conector", "1.0.0", herramientasCrudas)).toThrow(
      ManifiestoConectorInvalido,
    );
  });
});
