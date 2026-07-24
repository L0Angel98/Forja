import { and, eq, inArray } from "drizzle-orm";
import type {
  AsociacionesDocumento,
  Documento,
  EstadoIndexacion,
  FiltrosListarDocumentos,
  RepositorioDocumentos,
  TipoArchivoDocumento,
} from "@forja/core";
import type { ForjaDb } from "../client";
import { document } from "../schema/document";
import { documentArea } from "../schema/document-area";
import { documentMachine } from "../schema/document-machine";
import { documentMachineFamily } from "../schema/document-machine-family";

export class RepositorioDocumentosDrizzle implements RepositorioDocumentos {
  constructor(private readonly db: ForjaDb) {}

  async crear(documento: Documento): Promise<void> {
    await this.db.insert(document).values({
      id: documento.id,
      nombre: documento.nombre,
      tipoArchivo: documento.tipoArchivo,
      rutaAlmacenada: documento.rutaAlmacenada,
      tamanoBytes: documento.tamanoBytes,
      version: documento.version,
      documentoAnteriorId: documento.documentoAnteriorId,
      vigente: documento.vigente,
      estadoIndexacion: documento.estadoIndexacion,
      subidoPor: documento.subidoPor,
      createdAt: documento.creadoEn,
    });

    await this.insertarAsociaciones(documento.id, documento.asociaciones);
  }

  async buscarPorId(id: string): Promise<Documento | null> {
    const [fila] = await this.db.select().from(document).where(eq(document.id, id)).limit(1);
    if (!fila) return null;

    const asociaciones = await this.cargarAsociaciones([id]);
    return mapear(fila, asociaciones.get(id) ?? asociacionesVacias());
  }

  async listar(filtros: FiltrosListarDocumentos): Promise<Documento[]> {
    const condiciones = [];
    if (filtros.soloVigentes) condiciones.push(eq(document.vigente, true));

    if (filtros.maquinaId) {
      const filas = await this.db
        .select({ documento: document })
        .from(document)
        .innerJoin(documentMachine, eq(documentMachine.documentId, document.id))
        .where(and(eq(documentMachine.machineId, filtros.maquinaId), ...condiciones));
      return this.mapearFilas(filas.map((f) => f.documento));
    }

    if (filtros.areaId) {
      const filas = await this.db
        .select({ documento: document })
        .from(document)
        .innerJoin(documentArea, eq(documentArea.documentId, document.id))
        .where(and(eq(documentArea.areaId, filtros.areaId), ...condiciones));
      return this.mapearFilas(filas.map((f) => f.documento));
    }

    const filas = await this.db
      .select()
      .from(document)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined);
    return this.mapearFilas(filas);
  }

  async actualizarVigencia(id: string, vigente: boolean): Promise<void> {
    await this.db.update(document).set({ vigente }).where(eq(document.id, id));
  }

  async actualizarEstadoIndexacion(id: string, estadoIndexacion: EstadoIndexacion): Promise<void> {
    await this.db.update(document).set({ estadoIndexacion }).where(eq(document.id, id));
  }

  private async insertarAsociaciones(documentId: string, asociaciones: AsociacionesDocumento): Promise<void> {
    if (asociaciones.maquinaIds.length > 0) {
      await this.db
        .insert(documentMachine)
        .values(asociaciones.maquinaIds.map((machineId) => ({ documentId, machineId })));
    }
    if (asociaciones.areaIds.length > 0) {
      await this.db.insert(documentArea).values(asociaciones.areaIds.map((areaId) => ({ documentId, areaId })));
    }
    if (asociaciones.familiaIds.length > 0) {
      await this.db
        .insert(documentMachineFamily)
        .values(asociaciones.familiaIds.map((machineFamilyId) => ({ documentId, machineFamilyId })));
    }
  }

  private async cargarAsociaciones(documentIds: string[]): Promise<Map<string, AsociacionesDocumento>> {
    const mapa = new Map<string, { maquinaIds: string[]; areaIds: string[]; familiaIds: string[] }>();
    for (const id of documentIds) mapa.set(id, { maquinaIds: [], areaIds: [], familiaIds: [] });
    if (documentIds.length === 0) return mapa;

    const [maquinas, areas, familias] = await Promise.all([
      this.db.select().from(documentMachine).where(inArray(documentMachine.documentId, documentIds)),
      this.db.select().from(documentArea).where(inArray(documentArea.documentId, documentIds)),
      this.db.select().from(documentMachineFamily).where(inArray(documentMachineFamily.documentId, documentIds)),
    ]);

    for (const fila of maquinas) mapa.get(fila.documentId)?.maquinaIds.push(fila.machineId);
    for (const fila of areas) mapa.get(fila.documentId)?.areaIds.push(fila.areaId);
    for (const fila of familias) mapa.get(fila.documentId)?.familiaIds.push(fila.machineFamilyId);

    return mapa;
  }

  private async mapearFilas(filas: (typeof document.$inferSelect)[]): Promise<Documento[]> {
    const asociaciones = await this.cargarAsociaciones(filas.map((f) => f.id));
    return filas.map((fila) => mapear(fila, asociaciones.get(fila.id) ?? asociacionesVacias()));
  }
}

function asociacionesVacias(): AsociacionesDocumento {
  return { maquinaIds: [], areaIds: [], familiaIds: [] };
}

function mapear(fila: typeof document.$inferSelect, asociaciones: AsociacionesDocumento): Documento {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipoArchivo: fila.tipoArchivo as TipoArchivoDocumento,
    rutaAlmacenada: fila.rutaAlmacenada,
    tamanoBytes: fila.tamanoBytes,
    asociaciones,
    version: fila.version,
    documentoAnteriorId: fila.documentoAnteriorId,
    vigente: fila.vigente,
    estadoIndexacion: fila.estadoIndexacion as EstadoIndexacion,
    subidoPor: fila.subidoPor,
    creadoEn: fila.createdAt,
  };
}
