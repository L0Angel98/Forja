import type { ChunkTroceado, EstrategiaChunking, TextoExtraido } from "@forja/core";

const PATRON_ENCABEZADO = /^#{1,6}\s+(.+)$/;
const MAX_CARACTERES_SECCION = 2000;
const SOLAPAMIENTO_CARACTERES = 200;

interface Seccion {
  titulo: string | null;
  lineas: string[];
}

/**
 * Default para manuales: usa los encabezados Markdown (#, ##, ...) como
 * límites de sección. Espera texto ya en Markdown — para .md es el texto
 * original; para .docx, ExtractorTextoForja lo convierte a Markdown antes.
 * Si una sección es muy larga, se subdivide (mismo criterio que
 * PorTamañoFijo) conservando el título de sección en cada trozo.
 */
export class PorEncabezados implements EstrategiaChunking {
  readonly nombre = "por_encabezados";

  trocear(textoExtraido: TextoExtraido): ChunkTroceado[] {
    const secciones: Seccion[] = [{ titulo: null, lineas: [] }];

    for (const linea of textoExtraido.texto.split("\n")) {
      const match = PATRON_ENCABEZADO.exec(linea);
      if (match) {
        secciones.push({ titulo: match[1]!.trim(), lineas: [] });
      } else {
        secciones[secciones.length - 1]!.lineas.push(linea);
      }
    }

    return secciones.flatMap((seccion) => {
      const contenido = seccion.lineas.join("\n").trim();
      if (!contenido) return [];
      return subdividirSiEsNecesario(contenido, seccion.titulo);
    });
  }
}

function subdividirSiEsNecesario(contenido: string, seccion: string | null): ChunkTroceado[] {
  if (contenido.length <= MAX_CARACTERES_SECCION) {
    return [{ contenido, seccion, pagina: null }];
  }

  const chunks: ChunkTroceado[] = [];
  let inicio = 0;

  while (inicio < contenido.length) {
    const fin = Math.min(inicio + MAX_CARACTERES_SECCION, contenido.length);
    const trozo = contenido.slice(inicio, fin).trim();
    if (trozo) chunks.push({ contenido: trozo, seccion, pagina: null });
    if (fin >= contenido.length) break;
    inicio = fin - SOLAPAMIENTO_CARACTERES;
  }

  return chunks;
}
