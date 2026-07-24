import { describe, expect, it } from "vitest";
import type { RepositorioChunks } from "@forja/core";

export interface ArnesContratoRepositorioChunks {
  chunks: RepositorioChunks;
  /** Crea un documento vigente asociado a las áreas dadas y devuelve su id. */
  crearDocumento(areaIds: string[]): Promise<string>;
  /** Crea un chunk vigente para ese documento con el embedding dado. */
  crearChunk(documentoId: string, embedding: number[]): Promise<void>;
}

/**
 * Suite de contrato (principio L de SOLID, ver 01-estandares.md) para el
 * filtro por área de RepositorioChunks.buscarSimilares (spec 14, acceptance
 * criteria): cualquier implementación —en memoria o Drizzle— debe excluir
 * los chunks de documentos fuera de las áreas dadas, y no filtrar nada si
 * no se pasa ningún área.
 */
export function pruebasDeContratoFiltroAreaRepositorioChunks(
  nombre: string,
  construirArnes: () => ArnesContratoRepositorioChunks | Promise<ArnesContratoRepositorioChunks>,
): void {
  describe(`RepositorioChunks — filtro por área (${nombre})`, () => {
    it("solo devuelve chunks de documentos asociados a una de las áreas dadas", async () => {
      const arnes = await construirArnes();
      const documentoAreaA = await arnes.crearDocumento(["area-a"]);
      const documentoAreaB = await arnes.crearDocumento(["area-b"]);
      await arnes.crearChunk(documentoAreaA, [1, 0, 0]);
      await arnes.crearChunk(documentoAreaB, [1, 0, 0]);

      const resultados = await arnes.chunks.buscarSimilares([1, 0, 0], {
        areaIds: ["area-a"],
        topK: 10,
        umbralSimilitud: 0,
      });

      expect(resultados.some((r) => r.documentoId === documentoAreaA)).toBe(true);
      expect(resultados.some((r) => r.documentoId === documentoAreaB)).toBe(false);
    });

    it("sin filtro de área, devuelve chunks de cualquier área", async () => {
      const arnes = await construirArnes();
      const documentoAreaA = await arnes.crearDocumento(["area-a"]);
      const documentoAreaB = await arnes.crearDocumento(["area-b"]);
      await arnes.crearChunk(documentoAreaA, [1, 0, 0]);
      await arnes.crearChunk(documentoAreaB, [1, 0, 0]);

      const resultados = await arnes.chunks.buscarSimilares([1, 0, 0], { topK: 10, umbralSimilitud: 0 });

      expect(resultados.some((r) => r.documentoId === documentoAreaA)).toBe(true);
      expect(resultados.some((r) => r.documentoId === documentoAreaB)).toBe(true);
    });
  });
}
