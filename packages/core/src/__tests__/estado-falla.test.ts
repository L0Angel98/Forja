import { describe, expect, it } from "vitest";
import { transicionValida } from "../estado-falla";

describe("transicionValida (patrón State de ReporteFalla)", () => {
  it("permite la secuencia abierto → en_revision → atendido → cerrado", () => {
    expect(transicionValida("abierto", "en_revision")).toBe(true);
    expect(transicionValida("en_revision", "atendido")).toBe(true);
    expect(transicionValida("atendido", "cerrado")).toBe(true);
  });

  it("rechaza saltos de estado", () => {
    expect(transicionValida("abierto", "atendido")).toBe(false);
    expect(transicionValida("abierto", "cerrado")).toBe(false);
  });

  it("rechaza retrocesos", () => {
    expect(transicionValida("en_revision", "abierto")).toBe(false);
    expect(transicionValida("cerrado", "atendido")).toBe(false);
  });

  it("un reporte cerrado no tiene transiciones válidas", () => {
    expect(transicionValida("cerrado", "en_revision")).toBe(false);
  });
});
