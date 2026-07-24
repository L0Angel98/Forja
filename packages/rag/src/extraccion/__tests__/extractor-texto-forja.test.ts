import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { ExtractorTextoForja } from "../extractor-texto-forja";

async function crearPdfDePrueba(): Promise<Buffer> {
  const documento = await PDFDocument.create();
  const fuente = await documento.embedFont(StandardFonts.Helvetica);

  const pagina1 = documento.addPage([300, 300]);
  pagina1.drawText("Contenido de la página uno", { x: 20, y: 250, size: 14, font: fuente });

  const pagina2 = documento.addPage([300, 300]);
  pagina2.drawText("Contenido de la página dos", { x: 20, y: 250, size: 14, font: fuente });

  return Buffer.from(await documento.save());
}

async function crearDocxDePrueba(): Promise<Buffer> {
  const documento = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Manual de Ensamble", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Este manual describe el proceso de ensamble." }),
          new Paragraph({ text: "Paso 1", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "Colocar la pieza A en la base." }),
        ],
      },
    ],
  });

  return Packer.toBuffer(documento);
}

describe("ExtractorTextoForja", () => {
  it("extrae markdown tal cual, sin páginas", async () => {
    const extractor = new ExtractorTextoForja();

    const resultado = await extractor.extraer(Buffer.from("# Título\n\nContenido."), "md");

    expect(resultado).toEqual({ texto: "# Título\n\nContenido.", totalPaginas: null, paginas: null });
  });

  it("extrae texto de un PDF real, con desglose por página", async () => {
    const extractor = new ExtractorTextoForja();
    const pdf = await crearPdfDePrueba();

    const resultado = await extractor.extraer(pdf, "pdf");

    expect(resultado.totalPaginas).toBe(2);
    expect(resultado.paginas).toHaveLength(2);
    expect(resultado.paginas?.[0]).toContain("Contenido de la página uno");
    expect(resultado.paginas?.[1]).toContain("Contenido de la página dos");
    expect(resultado.texto).toContain("Contenido de la página uno");
  }, 15_000);

  it("extrae texto de un DOCX real, convertido a Markdown con encabezados", async () => {
    const extractor = new ExtractorTextoForja();
    const docx = await crearDocxDePrueba();

    const resultado = await extractor.extraer(docx, "docx");

    expect(resultado.totalPaginas).toBeNull();
    expect(resultado.paginas).toBeNull();
    expect(resultado.texto).toMatch(/^#\s+Manual de Ensamble/m);
    expect(resultado.texto).toContain("Este manual describe el proceso de ensamble.");
    expect(resultado.texto).toMatch(/^##\s+Paso 1/m);
    expect(resultado.texto).toContain("Colocar la pieza A en la base.");
  });
});
