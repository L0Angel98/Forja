import { describe, expect, it } from "vitest";
import { indexarDocumento } from "../indexar-documento";
import { DocumentoNoEncontrado } from "../../errors/documento-no-encontrado";
import type { Documento } from "../../entities/documento";
import type { EstrategiaChunking } from "../../ports/estrategia-chunking";
import type { SelectorEstrategiaChunking } from "../../ports/selector-estrategia-chunking";
import {
  crearAlmacenArchivosFalso,
  crearExtractorTextoFalso,
  crearGeneradorEmbeddingsFalso,
  crearRepositorioChunksFalso,
  crearRepositorioDocumentosFalso,
} from "../../testing/fakes";

const DOCUMENTO: Documento = {
  id: "documento-1",
  nombre: "Manual.pdf",
  tipoArchivo: "pdf",
  rutaAlmacenada: "falso://1",
  tamanoBytes: 10,
  asociaciones: { maquinaIds: ["maquina-1"], areaIds: [], familiaIds: [] },
  version: 1,
  documentoAnteriorId: null,
  vigente: true,
  estadoIndexacion: "pendiente",
  subidoPor: "usuario-admin",
  creadoEn: new Date("2025-01-01T00:00:00.000Z"),
};

const ESTRATEGIA_DOS_PARRAFOS: EstrategiaChunking = {
  nombre: "dos-parrafos",
  trocear: () => [
    { contenido: "primer párrafo", seccion: "Introducción", pagina: 1 },
    { contenido: "segundo párrafo", seccion: "Introducción", pagina: 1 },
  ],
};

function construir() {
  const documentos = crearRepositorioDocumentosFalso([DOCUMENTO]);
  const almacen = crearAlmacenArchivosFalso();
  almacen.archivos.set(DOCUMENTO.rutaAlmacenada, Buffer.from("contenido"));
  const chunks = crearRepositorioChunksFalso(documentos.documentos);
  const selectorEstrategia: SelectorEstrategiaChunking = { seleccionar: () => ESTRATEGIA_DOS_PARRAFOS };
  let contador = 0;

  return {
    documentos,
    almacen,
    extractor: crearExtractorTextoFalso({ texto: "primer párrafo\n\nsegundo párrafo", totalPaginas: 1 }),
    selectorEstrategia,
    embeddings: crearGeneradorEmbeddingsFalso(),
    chunks,
    generarId: () => `chunk-${(contador += 1)}`,
  };
}

describe("indexarDocumento", () => {
  it("extrae, trocea, genera embeddings, guarda los chunks y marca el documento indexado", async () => {
    const deps = construir();

    await indexarDocumento(deps, { documentoId: DOCUMENTO.id });

    expect(deps.chunks.chunks).toHaveLength(2);
    expect(deps.chunks.chunks[0]).toMatchObject({
      documentoId: DOCUMENTO.id,
      indice: 0,
      contenido: "primer párrafo",
      seccion: "Introducción",
      pagina: 1,
    });
    expect(deps.chunks.chunks[0]?.embedding.length).toBeGreaterThan(0);
    expect(deps.documentos.documentos.get(DOCUMENTO.id)?.estadoIndexacion).toBe("indexado");
  });

  it("pasa por 'indexando' antes de terminar", async () => {
    const deps = construir();
    const estados: string[] = [];
    const original = deps.documentos.actualizarEstadoIndexacion.bind(deps.documentos);
    deps.documentos.actualizarEstadoIndexacion = async (id, estado) => {
      estados.push(estado);
      await original(id, estado);
    };

    await indexarDocumento(deps, { documentoId: DOCUMENTO.id });

    expect(estados).toEqual(["indexando", "indexado"]);
  });

  it("si falla la extracción, marca el documento fallido y relanza el error", async () => {
    const deps = construir();
    deps.extractor = {
      async extraer() {
        throw new Error("PDF corrupto");
      },
    };

    await expect(indexarDocumento(deps, { documentoId: DOCUMENTO.id })).rejects.toThrow("PDF corrupto");
    expect(deps.documentos.documentos.get(DOCUMENTO.id)?.estadoIndexacion).toBe("fallido");
  });

  it("rechaza un documento inexistente", async () => {
    const deps = construir();

    await expect(indexarDocumento(deps, { documentoId: "no-existe" })).rejects.toThrow(DocumentoNoEncontrado);
  });
});
