import { describe, expect, it } from "vitest";
import { colores, COLOR_POR_SEVERIDAD, SEVERIDADES } from "../tokens";

describe("COLOR_POR_SEVERIDAD", () => {
  it("cubre las 4 severidades con 4 colores andon distintos (verde, ámbar, naranja, rojo)", () => {
    expect(SEVERIDADES).toEqual([1, 2, 3, 4]);
    expect(COLOR_POR_SEVERIDAD[1]).toBe(colores.andonVerde);
    expect(COLOR_POR_SEVERIDAD[2]).toBe(colores.andonAmbar);
    expect(COLOR_POR_SEVERIDAD[3]).toBe(colores.andonNaranja);
    expect(COLOR_POR_SEVERIDAD[4]).toBe(colores.andonRojo);

    const valores = Object.values(COLOR_POR_SEVERIDAD);
    expect(new Set(valores).size).toBe(4);
  });
});
