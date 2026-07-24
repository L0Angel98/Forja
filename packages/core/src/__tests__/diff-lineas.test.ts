import { describe, expect, it } from "vitest";
import { calcularDiffLineas } from "../diff-lineas";

describe("calcularDiffLineas", () => {
  it("no produce salida cuando el contenido es idéntico", () => {
    expect(calcularDiffLineas("hola\nmundo", "hola\nmundo")).toBe("");
  });

  it("marca las líneas que cambiaron", () => {
    const diff = calcularDiffLineas("Eres Forja.\nSé breve.", "Eres Forja.\nSé formal.");
    expect(diff).toBe("-Sé breve.\n+Sé formal.");
  });

  it("marca líneas agregadas al final", () => {
    const diff = calcularDiffLineas("línea 1", "línea 1\nlínea 2");
    expect(diff).toBe("+línea 2");
  });
});
