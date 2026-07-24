import { describe, expect, it } from "vitest";
import { cargarDocumento, TRABAJO_INDEXAR_DOCUMENTO } from "../cargar-documento";
import { DocumentoDemasiadoGrande } from "../../errors/documento-demasiado-grande";
import { DocumentoSinAsociacion } from "../../errors/documento-sin-asociacion";
import { MAXIMO_BYTES_DOCUMENTO } from "../../entities/documento";
import { crearAlmacenArchivosFalso, crearColaTrabajosFalso, crearRepositorioDocumentosFalso } from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");

function construir() {
  return {
    documentos: crearRepositorioDocumentosFalso(),
    almacen: crearAlmacenArchivosFalso(),
    cola: crearColaTrabajosFalso(),
    generarId: () => "documento-1",
  };
}

describe("cargarDocumento", () => {
  it("guarda el archivo, crea el documento vigente v1 y encola la indexación", async () => {
    const deps = construir();

    const documento = await cargarDocumento(deps, {
      nombre: "Manual Torno CNC.pdf",
      tipoArchivo: "pdf",
      contenido: Buffer.from("contenido de prueba"),
      asociaciones: { maquinaIds: ["maquina-1"], areaIds: [], familiaIds: [] },
      subidoPor: "usuario-admin",
      ahora: AHORA,
    });

    expect(documento).toMatchObject({
      id: "documento-1",
      nombre: "Manual Torno CNC.pdf",
      version: 1,
      documentoAnteriorId: null,
      vigente: true,
      estadoIndexacion: "pendiente",
    });
    expect(deps.documentos.documentos.get("documento-1")).toEqual(documento);
    expect(deps.almacen.archivos.get(documento.rutaAlmacenada)?.toString()).toBe("contenido de prueba");
    expect(deps.cola.encolados).toEqual([{ tipo: TRABAJO_INDEXAR_DOCUMENTO, payload: { documentoId: "documento-1" } }]);
  });

  it("rechaza un documento sin ninguna asociación", async () => {
    const deps = construir();

    await expect(
      cargarDocumento(deps, {
        nombre: "x.pdf",
        tipoArchivo: "pdf",
        contenido: Buffer.from("x"),
        asociaciones: { maquinaIds: [], areaIds: [], familiaIds: [] },
        subidoPor: "usuario-admin",
        ahora: AHORA,
      }),
    ).rejects.toThrow(DocumentoSinAsociacion);
  });

  it("rechaza un documento que supera el tamaño máximo", async () => {
    const deps = construir();

    await expect(
      cargarDocumento(deps, {
        nombre: "x.pdf",
        tipoArchivo: "pdf",
        contenido: Buffer.alloc(MAXIMO_BYTES_DOCUMENTO + 1),
        asociaciones: { maquinaIds: ["maquina-1"], areaIds: [], familiaIds: [] },
        subidoPor: "usuario-admin",
        ahora: AHORA,
      }),
    ).rejects.toThrow(DocumentoDemasiadoGrande);
  });
});
