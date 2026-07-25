import { describe, expect, it } from "vitest";
import { colores } from "../tokens";

/**
 * "Contraste verificado ≥ 4.5:1 en texto normal y ≥ 7:1 en etiquetas de
 * severidad y estado" (spec 02-interfaz, acceptance criteria). axe-core en
 * los E2E solo exige AA (4.5:1) por defecto — este test cubre el piso AAA
 * (7:1) que la spec pide específicamente para EtiquetaSeveridad/
 * EtiquetaEstado, cuyo texto es siempre `--acero-050` sobre un fondo
 * derivado del color de estado (ver *.module.css de ambos componentes).
 */

function linealizar(canal: number): number {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const limpio = hex.replace("#", "");
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return 0.2126 * linealizar(r) + 0.7152 * linealizar(g) + 0.0722 * linealizar(b);
}

function contraste(hexA: string, hexB: string): number {
  const claro = Math.max(luminancia(hexA), luminancia(hexB));
  const oscuro = Math.min(luminancia(hexA), luminancia(hexB));
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Reproduce `color-mix(in srgb, X 22%, --acero-900)` de EtiquetaSeveridad.module.css. */
function mezclarConAcero900(hex: string, porcentaje: number): string {
  const base = hex.replace("#", "");
  const fondo = colores.acero900.replace("#", "");
  const canal = (offset: number): number => {
    const a = parseInt(base.slice(offset, offset + 2), 16);
    const b = parseInt(fondo.slice(offset, offset + 2), 16);
    return Math.round(a * porcentaje + b * (1 - porcentaje));
  };
  return `#${[0, 2, 4].map((offset) => canal(offset).toString(16).padStart(2, "0")).join("")}`;
}

const CONTRASTE_AAA_MINIMO = 7;

describe("contraste AAA de EtiquetaEstado y EtiquetaSeveridad", () => {
  it("EtiquetaEstado: acero-050 sobre acero-700 ≥ 7:1", () => {
    expect(contraste(colores.acero050, colores.acero700)).toBeGreaterThanOrEqual(CONTRASTE_AAA_MINIMO);
  });

  it.each([
    ["verde", colores.andonVerde],
    ["ambar", colores.andonAmbar],
    ["naranja", colores.andonNaranja],
    ["rojo", colores.andonRojo],
  ])("EtiquetaSeveridad (%s): acero-050 sobre el fondo mezclado ≥ 7:1", (_nombre, colorSeveridad) => {
    const fondo = mezclarConAcero900(colorSeveridad, 0.22);
    expect(contraste(colores.acero050, fondo)).toBeGreaterThanOrEqual(CONTRASTE_AAA_MINIMO);
  });
});
