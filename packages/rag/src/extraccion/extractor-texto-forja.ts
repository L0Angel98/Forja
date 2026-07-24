import type { ExtractorTexto, TextoExtraido, TipoArchivoDocumento } from "@forja/core";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import TurndownService from "turndown";

const turndown = new TurndownService({ headingStyle: "atx" });

/** Adapter del puerto ExtractorTexto: PDF vía pdf-parse, DOCX vía mammoth (a Markdown), MD tal cual. */
export class ExtractorTextoForja implements ExtractorTexto {
  async extraer(contenido: Buffer, tipo: TipoArchivoDocumento): Promise<TextoExtraido> {
    if (tipo === "pdf") return extraerPdf(contenido);
    if (tipo === "docx") return extraerDocx(contenido);
    return extraerMarkdown(contenido);
  }
}

async function extraerPdf(contenido: Buffer): Promise<TextoExtraido> {
  const parser = new PDFParse({ data: contenido });
  try {
    const resultado = await parser.getText();
    return {
      texto: resultado.text,
      totalPaginas: resultado.total,
      paginas: resultado.pages.map((pagina) => pagina.text),
    };
  } finally {
    await parser.destroy();
  }
}

async function extraerDocx(contenido: Buffer): Promise<TextoExtraido> {
  const resultado = await mammoth.convertToHtml({ buffer: contenido });
  const markdown = turndown.turndown(resultado.value);
  return { texto: markdown, totalPaginas: null, paginas: null };
}

async function extraerMarkdown(contenido: Buffer): Promise<TextoExtraido> {
  return { texto: contenido.toString("utf8"), totalPaginas: null, paginas: null };
}
