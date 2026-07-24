import { describe, expect, it } from "vitest";
import { buscarDocumentos } from "../buscar-documentos";
import type { Documento } from "../../entities/documento";
import { crearGeneradorEmbeddingsFalso, crearRepositorioChunksFalso, crearRepositorioDocumentosFalso } from "../../testing/fakes";

const DOC_ENSAMBLE: Documento = {
  id: "documento-ensamble",
  nombre: "Manual de Ensamble.pdf",
  tipoArchivo: "pdf",
  rutaAlmacenada: "falso://1",
  tamanoBytes: 10,
  asociaciones: { maquinaIds: [], areaIds: ["area-ensamble"], familiaIds: [] },
  version: 1,
  documentoAnteriorId: null,
  vigente: true,
  estadoIndexacion: "indexado",
  subidoPor: "usuario-admin",
  creadoEn: new Date("2025-01-01T00:00:00.000Z"),
};

const DOC_MAQUINADO: Documento = {
  ...DOC_ENSAMBLE,
  id: "documento-maquinado",
  nombre: "Manual de Maquinado.pdf",
  asociaciones: { maquinaIds: [], areaIds: ["area-maquinado"], familiaIds: [] },
};

function construir() {
  const documentos = crearRepositorioDocumentosFalso([DOC_ENSAMBLE, DOC_MAQUINADO]);
  const chunks = crearRepositorioChunksFalso(documentos.documentos);
  chunks.chunks.push(
    {
      id: "chunk-ensamble",
      documentoId: DOC_ENSAMBLE.id,
      indice: 0,
      contenido: "cómo ensamblar la pieza A",
      seccion: "Paso 1",
      pagina: 1,
      embedding: [1, 0, 0],
      vigente: true,
    },
    {
      id: "chunk-maquinado",
      documentoId: DOC_MAQUINADO.id,
      indice: 0,
      contenido: "cómo calibrar el torno",
      seccion: "Paso 1",
      pagina: 1,
      embedding: [1, 0, 0],
      vigente: true,
    },
    {
      id: "chunk-poco-relevante",
      documentoId: DOC_ENSAMBLE.id,
      indice: 1,
      contenido: "texto sin relación con la consulta",
      seccion: "Paso 2",
      pagina: 2,
      embedding: [0, 1, 0],
      vigente: true,
    },
  );

  const embeddings = crearGeneradorEmbeddingsFalso(() => [1, 0, 0]);

  return { embeddings, chunks };
}

describe("buscarDocumentos", () => {
  it("devuelve citas por encima del umbral, filtradas por área", async () => {
    const deps = construir();

    const citas = await buscarDocumentos(deps, { consulta: "¿cómo ensamblo la pieza A?", areaIds: ["area-ensamble"] });

    expect(citas).toHaveLength(1);
    expect(citas[0]).toMatchObject({
      documentoId: DOC_ENSAMBLE.id,
      documentoNombre: DOC_ENSAMBLE.nombre,
      contenido: "cómo ensamblar la pieza A",
      seccion: "Paso 1",
      pagina: 1,
    });
    expect(citas[0]?.similitud).toBeCloseTo(1, 5);
  });

  it("no incluye documentos fuera de las áreas del usuario", async () => {
    const deps = construir();

    const citas = await buscarDocumentos(deps, { consulta: "¿cómo calibro el torno?", areaIds: ["area-ensamble"] });

    expect(citas.some((c) => c.documentoId === DOC_MAQUINADO.id)).toBe(false);
  });

  it("sin filtro de área (supervisor/admin), devuelve resultados de cualquier área", async () => {
    const deps = construir();

    const citas = await buscarDocumentos(deps, { consulta: "¿cómo calibro el torno?" });

    expect(citas.map((c) => c.documentoId)).toEqual(
      expect.arrayContaining([DOC_ENSAMBLE.id, DOC_MAQUINADO.id]),
    );
  });

  it("devuelve un arreglo vacío si nada supera el umbral de similitud", async () => {
    const deps = construir();

    const citas = await buscarDocumentos(deps, {
      consulta: "algo totalmente ajeno",
      areaIds: ["area-ensamble"],
      umbralSimilitud: 2,
    });

    expect(citas).toEqual([]);
  });
});
