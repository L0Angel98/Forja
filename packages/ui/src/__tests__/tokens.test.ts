import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { colores, radios, TOUCH_TARGET_MINIMO, ANCHO_FRANJA_ANDON } from "../tokens";

const directorioActual = path.dirname(fileURLToPath(import.meta.url));
const contenidoTokensCss = fs.readFileSync(path.join(directorioActual, "..", "tokens.css"), "utf8");

function valorVariableCss(nombre: string): string | undefined {
  const patron = new RegExp(`--${nombre}:\\s*([^;]+);`);
  return patron.exec(contenidoTokensCss)?.[1]?.trim();
}

describe("tokens.css coincide con tokens.ts", () => {
  it.each([
    ["acero-900", colores.acero900],
    ["acero-700", colores.acero700],
    ["acero-300", colores.acero300],
    ["acero-050", colores.acero050],
    ["andon-verde", colores.andonVerde],
    ["andon-ambar", colores.andonAmbar],
    ["andon-naranja", colores.andonNaranja],
    ["andon-rojo", colores.andonRojo],
    ["senal-azul", colores.senalAzul],
    ["senal-azul-claro", colores.senalAzulClaro],
  ])("--%s", (nombreVariable, valorEsperado) => {
    expect(valorVariableCss(nombreVariable)?.toLowerCase()).toBe(valorEsperado.toLowerCase());
  });

  it("radios y touch target coinciden", () => {
    expect(valorVariableCss("radio-control")).toBe(radios.control);
    expect(valorVariableCss("radio-tarjeta")).toBe(radios.tarjeta);
    expect(valorVariableCss("touch-target-minimo")).toBe(TOUCH_TARGET_MINIMO);
    expect(valorVariableCss("ancho-franja-andon")).toBe(ANCHO_FRANJA_ANDON);
  });
});
