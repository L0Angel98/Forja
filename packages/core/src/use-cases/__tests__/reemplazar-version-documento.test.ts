import { describe, expect, it } from "vitest";
import { reemplazarVersionDocumento } from "../reemplazar-version-documento";
import { TRABAJO_INDEXAR_DOCUMENTO } from "../cargar-documento";
import { DocumentoNoEncontrado } from "../../errors/documento-no-encontrado";
import type { Documento } from "../../entities/documento";
import {
  crearAlmacenArchivosFalso,
  crearColaTrabajosFalso,
  crearRepositorioChunksFalso,
  crearRepositorioDocumentosFalso,
} from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");

const DOCUMENTO_V1: Documento = {
  id: "documento-1",
  nombre: "Manual Torno CNC.pdf",
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

function construir() {
  const documentos = crearRepositorioDocumentosFalso([DOCUMENTO_V1]);
  const chunks = crearRepositorioChunksFalso(documentos.documentos);
  chunks.chunks.push({
    id: "chunk-1",
    documentoId: DOCUMENTO_V1.id,
    indice: 0,
    contenido: "texto viejo",
    seccion: null,
    pagina: 1,
    embedding: [1, 0, 0],
    vigente: true,
  });

  return {
    documentos,
    chunks,
    almacen: crearAlmacenArchivosFalso(),
    cola: crearColaTrabajosFalso(),
    generarId: () => "documento-2",
  };
}

describe("reemplazarVersionDocumento", () => {
  it("crea la v2 vigente, marca la v1 y sus chunks no vigentes, y encola la reindexación", async () => {
    const deps = construir();

    const nuevo = await reemplazarVersionDocumento(deps, {
      documentoAnteriorId: DOCUMENTO_V1.id,
      nombre: "Manual Torno CNC v2.pdf",
      tipoArchivo: "pdf",
      contenido: Buffer.from("contenido nuevo"),
      subidoPor: "usuario-admin",
      ahora: AHORA,
    });

    expect(nuevo).toMatchObject({
      id: "documento-2",
      version: 2,
      documentoAnteriorId: DOCUMENTO_V1.id,
      vigente: true,
      asociaciones: DOCUMENTO_V1.asociaciones,
    });

    expect(deps.documentos.documentos.get(DOCUMENTO_V1.id)?.vigente).toBe(false);
    expect(deps.chunks.chunks.find((c) => c.id === "chunk-1")?.vigente).toBe(false);
    expect(deps.cola.encolados).toEqual([{ tipo: TRABAJO_INDEXAR_DOCUMENTO, payload: { documentoId: "documento-2" } }]);
  });

  it("rechaza si el documento anterior no existe", async () => {
    const deps = construir();

    await expect(
      reemplazarVersionDocumento(deps, {
        documentoAnteriorId: "no-existe",
        nombre: "x.pdf",
        tipoArchivo: "pdf",
        contenido: Buffer.from("x"),
        subidoPor: "usuario-admin",
        ahora: AHORA,
      }),
    ).rejects.toThrow(DocumentoNoEncontrado);
  });
});
