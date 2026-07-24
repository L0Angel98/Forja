import { randomUUID } from "node:crypto";
import { crearRepositorioChunksFalso, crearRepositorioDocumentosFalso, type Documento } from "@forja/core";
import { pruebasDeContratoFiltroAreaRepositorioChunks } from "./contracts/repositorio-chunks.contract";

function documentoVacio(id: string, areaIds: string[]): Documento {
  return {
    id,
    nombre: "documento de prueba",
    tipoArchivo: "md",
    rutaAlmacenada: "falso://x",
    tamanoBytes: 0,
    asociaciones: { maquinaIds: [], areaIds, familiaIds: [] },
    version: 1,
    documentoAnteriorId: null,
    vigente: true,
    estadoIndexacion: "indexado",
    subidoPor: "usuario-x",
    creadoEn: new Date(),
  };
}

pruebasDeContratoFiltroAreaRepositorioChunks("memoria", () => {
  const documentos = crearRepositorioDocumentosFalso();
  const chunks = crearRepositorioChunksFalso(documentos.documentos);

  return {
    chunks,
    async crearDocumento(areaIds) {
      const id = randomUUID();
      documentos.documentos.set(id, documentoVacio(id, areaIds));
      return id;
    },
    async crearChunk(documentoId, embedding) {
      chunks.chunks.push({
        id: randomUUID(),
        documentoId,
        indice: 0,
        contenido: "contenido de prueba",
        seccion: null,
        pagina: null,
        embedding,
        vigente: true,
      });
    },
  };
});
