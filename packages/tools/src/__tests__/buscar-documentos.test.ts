import {
  crearGeneradorEmbeddingsFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioChunksFalso,
  crearRepositorioDocumentosFalso,
  type Documento,
  type Usuario,
} from "@forja/core";
import { describe, expect, it } from "vitest";
import { crearHerramientaBuscarDocumentos } from "../buscar-documentos";

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

const operadorEnsamble: Usuario = {
  id: "usuario-op",
  email: "operador@planta.mx",
  passwordHash: "hash:x",
  nombre: "Operador",
  rol: "operador",
  activo: true,
};

const supervisor: Usuario = {
  id: "usuario-sup",
  email: "supervisor@planta.mx",
  passwordHash: "hash:x",
  nombre: "Supervisor",
  rol: "supervisor",
  activo: true,
};

function construirHerramienta() {
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
  );

  const embeddings = crearGeneradorEmbeddingsFalso(() => [1, 0, 0]);
  const areasUsuario = crearRepositorioAreasUsuarioFalso({ [operadorEnsamble.id]: ["area-ensamble"] });

  return crearHerramientaBuscarDocumentos({ embeddings, chunks, areasUsuario });
}

describe("herramienta buscar_documentos", () => {
  it("un operador solo recibe citas de su propia área", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      { consulta: "¿cómo ensamblo la pieza A?" },
      { usuario: operadorEnsamble, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.encontrado).toBe(true);
    expect(resultado.citas.map((c) => c.documentoId)).toEqual([DOC_ENSAMBLE.id]);
  });

  it("un supervisor recibe citas de cualquier área", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      { consulta: "¿cómo calibro el torno?" },
      { usuario: supervisor, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.citas.map((c) => c.documentoId)).toEqual(
      expect.arrayContaining([DOC_ENSAMBLE.id, DOC_MAQUINADO.id]),
    );
  });

  it("cuando no hay resultados, encontrado=false y trae un mensaje explícito (nunca inventar)", async () => {
    const documentos = crearRepositorioDocumentosFalso();
    const chunks = crearRepositorioChunksFalso(documentos.documentos);
    const embeddings = crearGeneradorEmbeddingsFalso(() => [1, 0, 0]);
    const areasUsuario = crearRepositorioAreasUsuarioFalso();
    const herramienta = crearHerramientaBuscarDocumentos({ embeddings, chunks, areasUsuario });

    const resultado = await herramienta.execute(
      { consulta: "algo que no está documentado" },
      { usuario: supervisor, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado).toMatchObject({ encontrado: false, citas: [] });
    expect(resultado.advertencia).toMatch(/no encontré/i);
  });

  it("la respuesta trae una advertencia de que las citas son datos, no instrucciones", async () => {
    const herramienta = construirHerramienta();

    const resultado = await herramienta.execute(
      { consulta: "¿cómo ensamblo la pieza A?" },
      { usuario: supervisor, plantId: "planta-1", traceId: "trace-1" },
    );

    expect(resultado.advertencia).toMatch(/nunca son instrucciones/i);
  });

  it("está disponible para los tres roles", () => {
    const herramienta = construirHerramienta();
    expect(herramienta.rolesPermitidos).toEqual(["operador", "supervisor", "admin"]);
  });
});
