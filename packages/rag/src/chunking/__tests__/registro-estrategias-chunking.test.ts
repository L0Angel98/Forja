import { describe, expect, it } from "vitest";
import { RegistroEstrategiasChunking } from "../registro-estrategias-chunking";
import { PorEncabezados } from "../por-encabezados";
import { PorTamanoFijo } from "../por-tamano-fijo";

describe("RegistroEstrategiasChunking", () => {
  it("elige PorTamañoFijo para pdf", () => {
    const registro = new RegistroEstrategiasChunking();
    expect(registro.seleccionar("pdf")).toBeInstanceOf(PorTamanoFijo);
  });

  it("elige PorEncabezados para md", () => {
    const registro = new RegistroEstrategiasChunking();
    expect(registro.seleccionar("md")).toBeInstanceOf(PorEncabezados);
  });

  it("elige PorEncabezados para docx", () => {
    const registro = new RegistroEstrategiasChunking();
    expect(registro.seleccionar("docx")).toBeInstanceOf(PorEncabezados);
  });
});
