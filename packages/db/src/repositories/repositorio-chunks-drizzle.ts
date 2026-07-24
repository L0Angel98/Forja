import { and, asc, cosineDistance, eq, inArray, lte, sql } from "drizzle-orm";
import type { ChunkDocumento, CitaDocumento, FiltrosBuscarSimilares, RepositorioChunks } from "@forja/core";
import type { ForjaDb } from "../client";
import { document } from "../schema/document";
import { documentArea } from "../schema/document-area";
import { documentChunk } from "../schema/document-chunk";
import { documentMachine } from "../schema/document-machine";

export class RepositorioChunksDrizzle implements RepositorioChunks {
  constructor(private readonly db: ForjaDb) {}

  async crearMuchos(chunks: readonly ChunkDocumento[]): Promise<void> {
    if (chunks.length === 0) return;
    await this.db.insert(documentChunk).values(
      chunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentoId,
        indice: chunk.indice,
        contenido: chunk.contenido,
        seccion: chunk.seccion,
        pagina: chunk.pagina,
        embedding: [...chunk.embedding],
        vigente: chunk.vigente,
      })),
    );
  }

  async buscarPorDocumento(documentoId: string): Promise<ChunkDocumento[]> {
    const filas = await this.db.select().from(documentChunk).where(eq(documentChunk.documentId, documentoId));
    return filas.map(mapear);
  }

  async marcarNoVigentesPorDocumento(documentoId: string): Promise<void> {
    await this.db.update(documentChunk).set({ vigente: false }).where(eq(documentChunk.documentId, documentoId));
  }

  async buscarSimilares(
    embeddingConsulta: readonly number[],
    filtros: FiltrosBuscarSimilares,
  ): Promise<CitaDocumento[]> {
    const idsPermitidos = await this.resolverDocumentosPermitidos(filtros);
    if (idsPermitidos && idsPermitidos.size === 0) return [];

    const distancia = sql<number>`${cosineDistance(documentChunk.embedding, [...embeddingConsulta])}`;

    const condiciones = [eq(documentChunk.vigente, true), eq(document.vigente, true), lte(distancia, 1 - filtros.umbralSimilitud)];
    if (idsPermitidos) condiciones.push(inArray(documentChunk.documentId, [...idsPermitidos]));

    const filas = await this.db
      .select({
        documentoId: documentChunk.documentId,
        documentoNombre: document.nombre,
        contenido: documentChunk.contenido,
        seccion: documentChunk.seccion,
        pagina: documentChunk.pagina,
        distancia,
      })
      .from(documentChunk)
      .innerJoin(document, eq(documentChunk.documentId, document.id))
      .where(and(...condiciones))
      .orderBy(asc(distancia))
      .limit(filtros.topK);

    return filas.map((fila) => ({
      documentoId: fila.documentoId,
      documentoNombre: fila.documentoNombre,
      contenido: fila.contenido,
      seccion: fila.seccion,
      pagina: fila.pagina,
      similitud: 1 - fila.distancia,
    }));
  }

  /**
   * Devuelve el conjunto de document_id elegibles según área/máquina, o
   * `undefined` si no hay restricción (sin filtro de área: supervisor/admin
   * ven todo). Un documento sin máquinas asociadas se incluye igual aunque
   * haya una máquina en contexto (documentación de área/planta general);
   * solo se excluye si SÍ tiene máquinas asociadas y la del contexto no
   * está entre ellas.
   */
  private async resolverDocumentosPermitidos(filtros: FiltrosBuscarSimilares): Promise<Set<string> | undefined> {
    if (!filtros.areaIds && !filtros.maquinaId) return undefined;

    let permitidos: Set<string> | undefined;

    if (filtros.areaIds && filtros.areaIds.length > 0) {
      const filas = await this.db
        .select({ documentId: documentArea.documentId })
        .from(documentArea)
        .where(inArray(documentArea.areaId, [...filtros.areaIds]));
      permitidos = new Set(filas.map((f) => f.documentId));
    }

    if (filtros.maquinaId) {
      const todas = await this.db.select().from(documentMachine);
      const maquinasPorDocumento = new Map<string, string[]>();
      for (const fila of todas) {
        maquinasPorDocumento.set(fila.documentId, [...(maquinasPorDocumento.get(fila.documentId) ?? []), fila.machineId]);
      }

      const cumpleMaquina = (documentId: string): boolean => {
        const maquinas = maquinasPorDocumento.get(documentId);
        return !maquinas || maquinas.length === 0 || maquinas.includes(filtros.maquinaId!);
      };

      if (permitidos) {
        permitidos = new Set([...permitidos].filter(cumpleMaquina));
      } else {
        const todosLosDocumentos = await this.db.select({ id: document.id }).from(document);
        permitidos = new Set(todosLosDocumentos.map((d) => d.id).filter(cumpleMaquina));
      }
    }

    return permitidos;
  }
}

function mapear(fila: typeof documentChunk.$inferSelect): ChunkDocumento {
  return {
    id: fila.id,
    documentoId: fila.documentId,
    indice: fila.indice,
    contenido: fila.contenido,
    seccion: fila.seccion,
    pagina: fila.pagina,
    embedding: fila.embedding,
    vigente: fila.vigente,
  };
}
