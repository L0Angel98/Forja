import { describe, expect, it } from "vitest";
import { eliminarDocumento } from "../eliminar-documento";
import { DocumentoNoEncontrado } from "../../errors/documento-no-encontrado";
import type { Documento } from "../../entities/documento";
import { crearRepositorioChunksFalso, crearRepositorioDocumentosFalso } from "../../testing/fakes";

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
  estadoIndexacion: "indexado",
  subidoPor: "usuario-admin",
  creadoEn: new Date("2025-01-01T00:00:00.000Z"),
};

describe("eliminarDocumento", () => {
  it("marca el documento y sus chunks como no vigentes (soft delete)", async () => {
    const documentos = crearRepositorioDocumentosFalso([DOCUMENTO]);
    const chunks = crearRepositorioChunksFalso(documentos.documentos);
    chunks.chunks.push({
      id: "chunk-1",
      documentoId: DOCUMENTO.id,
      indice: 0,
      contenido: "texto",
      seccion: null,
      pagina: null,
      embedding: [1, 0, 0],
      vigente: true,
    });

    await eliminarDocumento({ documentos, chunks }, { id: DOCUMENTO.id });

    expect(documentos.documentos.get(DOCUMENTO.id)?.vigente).toBe(false);
    expect(chunks.chunks[0]?.vigente).toBe(false);
  });

  it("rechaza un documento inexistente", async () => {
    const documentos = crearRepositorioDocumentosFalso();
    const chunks = crearRepositorioChunksFalso();

    await expect(eliminarDocumento({ documentos, chunks }, { id: "no-existe" })).rejects.toThrow(
      DocumentoNoEncontrado,
    );
  });
});
