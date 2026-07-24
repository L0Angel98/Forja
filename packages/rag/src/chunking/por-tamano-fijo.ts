import type { ChunkTroceado, EstrategiaChunking, TextoExtraido } from "@forja/core";

const TAMANO_CHUNK_CARACTERES = 1500;
const SOLAPAMIENTO_CARACTERES = 200;

/**
 * Fallback: divide el texto en bloques de tamaño fijo con solapamiento, para
 * que no se pierda contexto en los bordes. Cuando hay texto por página
 * (PDF), trocea página por página y conserva el número de página en cada
 * chunk.
 */
export class PorTamanoFijo implements EstrategiaChunking {
  readonly nombre = "por_tamano_fijo";

  trocear(textoExtraido: TextoExtraido): ChunkTroceado[] {
    if (textoExtraido.paginas && textoExtraido.paginas.length > 0) {
      return textoExtraido.paginas.flatMap((textoPagina, indice) =>
        trocearTexto(textoPagina, null, indice + 1),
      );
    }
    return trocearTexto(textoExtraido.texto, null, null);
  }
}

function trocearTexto(texto: string, seccion: string | null, pagina: number | null): ChunkTroceado[] {
  const limpio = texto.trim();
  if (!limpio) return [];

  const chunks: ChunkTroceado[] = [];
  let inicio = 0;

  while (inicio < limpio.length) {
    const fin = Math.min(inicio + TAMANO_CHUNK_CARACTERES, limpio.length);
    const contenido = limpio.slice(inicio, fin).trim();
    if (contenido) chunks.push({ contenido, seccion, pagina });
    if (fin >= limpio.length) break;
    inicio = fin - SOLAPAMIENTO_CARACTERES;
  }

  return chunks;
}
