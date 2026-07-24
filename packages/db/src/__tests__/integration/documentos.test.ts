import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Documento } from "@forja/core";
import { DIMENSION_EMBEDDING } from "../../schema/document-chunk";
import { crearCliente, type ForjaDb } from "../../client";
import { ejecutarMigraciones } from "../../migrate";
import { RepositorioChunksDrizzle } from "../../repositories/repositorio-chunks-drizzle";
import { RepositorioDocumentosDrizzle } from "../../repositories/repositorio-documentos-drizzle";
import { RepositorioFeedbackDrizzle } from "../../repositories/repositorio-feedback-drizzle";
import { agentTrace, appUser, area, machine, plant, role } from "../../schema/index";
import { pruebasDeContratoFiltroAreaRepositorioChunks } from "../contracts/repositorio-chunks.contract";

function vector(valorPrincipal: number): number[] {
  const v = new Array<number>(DIMENSION_EMBEDDING).fill(0);
  v[0] = valorPrincipal;
  return v;
}

function rellenar(v: readonly number[]): number[] {
  const salida = new Array<number>(DIMENSION_EMBEDDING).fill(0);
  for (let i = 0; i < v.length; i++) salida[i] = v[i]!;
  return salida;
}

/** Rellena embeddings de baja dimensión (como los del contrato) a la dimensión real de la columna vector. */
function repositorioChunksConRelleno(real: RepositorioChunksDrizzle) {
  return {
    crearMuchos: (chunks: Parameters<RepositorioChunksDrizzle["crearMuchos"]>[0]) =>
      real.crearMuchos(chunks.map((c) => ({ ...c, embedding: rellenar(c.embedding) }))),
    buscarPorDocumento: (id: string) => real.buscarPorDocumento(id),
    marcarNoVigentesPorDocumento: (id: string) => real.marcarNoVigentesPorDocumento(id),
    buscarSimilares: (embeddingConsulta: readonly number[], filtros: Parameters<RepositorioChunksDrizzle["buscarSimilares"]>[1]) =>
      real.buscarSimilares(rellenar(embeddingConsulta), filtros),
  };
}

describe("documentos y RAG (Postgres real)", () => {
  let contenedor: StartedPostgreSqlContainer | undefined;
  let db: ForjaDb;
  let cerrarConexion: (() => Promise<void>) | undefined;

  let plantaId: string;
  let areaEnsambleId: string;
  let areaMaquinadoId: string;
  let maquinaPrensaId: string;
  let maquinaTornoId: string;
  let adminId: string;

  beforeAll(async () => {
    contenedor = await new PostgreSqlContainer("timescale/timescaledb-ha:pg16")
      .withDatabase("forja")
      .withUsername("forja")
      .withPassword("forja")
      .start();

    const cliente = crearCliente(contenedor.getConnectionUri());
    db = cliente.db;
    cerrarConexion = cliente.cerrar;

    await ejecutarMigraciones(contenedor.getConnectionUri());

    await db.insert(role).values([{ id: "operador" }, { id: "supervisor" }, { id: "admin" }]);
    const [planta] = await db.insert(plant).values({ nombre: "Planta Documentos Test" }).returning();
    plantaId = planta!.id;

    const [ensamble] = await db.insert(area).values({ plantId: planta!.id, nombre: "Ensamble" }).returning();
    const [maquinado] = await db.insert(area).values({ plantId: planta!.id, nombre: "Maquinado" }).returning();
    areaEnsambleId = ensamble!.id;
    areaMaquinadoId = maquinado!.id;

    const [prensa] = await db.insert(machine).values({ areaId: areaEnsambleId, nombre: "Prensa" }).returning();
    const [torno] = await db.insert(machine).values({ areaId: areaMaquinadoId, nombre: "Torno CNC" }).returning();
    maquinaPrensaId = prensa!.id;
    maquinaTornoId = torno!.id;

    const [admin] = await db
      .insert(appUser)
      .values({ email: "admin@planta.mx", nombre: "Admin", roleId: "admin", passwordHash: "hash:x" })
      .returning();
    adminId = admin!.id;
  }, 120_000);

  afterAll(async () => {
    await cerrarConexion?.();
    await contenedor?.stop();
  });

  it("RepositorioDocumentosDrizzle: crea con asociaciones, busca, lista con filtros y actualiza estado", async () => {
    const documentos = new RepositorioDocumentosDrizzle(db);
    const documento: Documento = {
      id: randomUUID(),
      nombre: "Manual de la Prensa.pdf",
      tipoArchivo: "pdf",
      rutaAlmacenada: "local://manual-prensa.pdf",
      tamanoBytes: 1024,
      asociaciones: { maquinaIds: [maquinaPrensaId], areaIds: [areaEnsambleId], familiaIds: [] },
      version: 1,
      documentoAnteriorId: null,
      vigente: true,
      estadoIndexacion: "pendiente",
      subidoPor: adminId,
      creadoEn: new Date(),
    };

    await documentos.crear(documento);

    expect(await documentos.buscarPorId(documento.id)).toEqual(documento);
    expect(await documentos.buscarPorId(randomUUID())).toBeNull();

    expect((await documentos.listar({ maquinaId: maquinaPrensaId })).map((d) => d.id)).toContain(documento.id);
    expect((await documentos.listar({ maquinaId: maquinaTornoId })).map((d) => d.id)).not.toContain(documento.id);
    expect((await documentos.listar({ areaId: areaEnsambleId })).map((d) => d.id)).toContain(documento.id);
    expect((await documentos.listar({ areaId: areaMaquinadoId })).map((d) => d.id)).not.toContain(documento.id);

    await documentos.actualizarEstadoIndexacion(documento.id, "indexado");
    expect((await documentos.buscarPorId(documento.id))?.estadoIndexacion).toBe("indexado");

    await documentos.actualizarVigencia(documento.id, false);
    expect((await documentos.buscarPorId(documento.id))?.vigente).toBe(false);
    expect((await documentos.listar({ soloVigentes: true })).map((d) => d.id)).not.toContain(documento.id);
  });

  it("RepositorioChunksDrizzle: crea, lista por documento, marca no vigentes y busca por similitud con filtros", async () => {
    const documentos = new RepositorioDocumentosDrizzle(db);
    const chunks = new RepositorioChunksDrizzle(db);

    const docEnsamble: Documento = {
      id: randomUUID(),
      nombre: "Manual de Ensamble.pdf",
      tipoArchivo: "pdf",
      rutaAlmacenada: "local://ensamble.pdf",
      tamanoBytes: 10,
      asociaciones: { maquinaIds: [], areaIds: [areaEnsambleId], familiaIds: [] },
      version: 1,
      documentoAnteriorId: null,
      vigente: true,
      estadoIndexacion: "indexado",
      subidoPor: adminId,
      creadoEn: new Date(),
    };
    const docMaquinado: Documento = {
      ...docEnsamble,
      id: randomUUID(),
      nombre: "Manual de Maquinado.pdf",
      rutaAlmacenada: "local://maquinado.pdf",
      asociaciones: { maquinaIds: [], areaIds: [areaMaquinadoId], familiaIds: [] },
    };
    await documentos.crear(docEnsamble);
    await documentos.crear(docMaquinado);

    await chunks.crearMuchos([
      {
        id: randomUUID(),
        documentoId: docEnsamble.id,
        indice: 0,
        contenido: "cómo ensamblar la pieza A",
        seccion: "Paso 1",
        pagina: 1,
        embedding: vector(1),
        vigente: true,
      },
      {
        id: randomUUID(),
        documentoId: docMaquinado.id,
        indice: 0,
        contenido: "cómo calibrar el torno",
        seccion: "Paso 1",
        pagina: 1,
        embedding: vector(1),
        vigente: true,
      },
    ]);

    expect(await chunks.buscarPorDocumento(docEnsamble.id)).toHaveLength(1);

    const soloEnsamble = await chunks.buscarSimilares(vector(1), {
      areaIds: [areaEnsambleId],
      topK: 6,
      umbralSimilitud: 0.5,
    });
    expect(soloEnsamble.map((c) => c.documentoId)).toEqual([docEnsamble.id]);
    expect(soloEnsamble[0]?.similitud).toBeCloseTo(1, 5);

    const sinFiltroDeArea = await chunks.buscarSimilares(vector(1), { topK: 6, umbralSimilitud: 0.5 });
    expect(sinFiltroDeArea.map((c) => c.documentoId).sort()).toEqual([docEnsamble.id, docMaquinado.id].sort());

    await chunks.marcarNoVigentesPorDocumento(docEnsamble.id);
    const trasMarcarNoVigente = await chunks.buscarSimilares(vector(1), { topK: 6, umbralSimilitud: 0.5 });
    expect(trasMarcarNoVigente.map((c) => c.documentoId)).toEqual([docMaquinado.id]);
  });

  it("RepositorioFeedbackDrizzle: crea feedback asociado a un trace", async () => {
    const [planta] = await db.select().from(plant).limit(1);
    const [trace] = await db
      .insert(agentTrace)
      .values({ plantId: planta!.id, userId: adminId, origen: "chat", exitoso: true })
      .returning();

    const feedback = new RepositorioFeedbackDrizzle(db);
    await feedback.crear({ id: randomUUID(), traceId: trace!.id, util: true, creadoEn: new Date() });
  });

  pruebasDeContratoFiltroAreaRepositorioChunks("drizzle", () => {
    const documentos = new RepositorioDocumentosDrizzle(db);
    const chunks = repositorioChunksConRelleno(new RepositorioChunksDrizzle(db));
    const areasPorClave = new Map<string, string>();

    async function resolverAreaId(clave: string): Promise<string> {
      const existente = areasPorClave.get(clave);
      if (existente) return existente;
      const [fila] = await db
        .insert(area)
        .values({ plantId: plantaId, nombre: `área-contrato-${clave}-${randomUUID()}` })
        .returning();
      areasPorClave.set(clave, fila!.id);
      return fila!.id;
    }

    return {
      chunks,
      async crearDocumento(clavesArea) {
        const areaIds = await Promise.all(clavesArea.map(resolverAreaId));
        const documento: Documento = {
          id: randomUUID(),
          nombre: "documento de contrato",
          tipoArchivo: "md",
          rutaAlmacenada: "local://contrato",
          tamanoBytes: 0,
          asociaciones: { maquinaIds: [], areaIds, familiaIds: [] },
          version: 1,
          documentoAnteriorId: null,
          vigente: true,
          estadoIndexacion: "indexado",
          subidoPor: adminId,
          creadoEn: new Date(),
        };
        await documentos.crear(documento);
        return documento.id;
      },
      async crearChunk(documentoId, embedding) {
        await chunks.crearMuchos([
          {
            id: randomUUID(),
            documentoId,
            indice: 0,
            contenido: "contenido de contrato",
            seccion: null,
            pagina: null,
            embedding,
            vigente: true,
          },
        ]);
      },
    };
  });
});
