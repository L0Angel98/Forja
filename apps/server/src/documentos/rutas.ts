import {
  cargarDocumento,
  DocumentoDemasiadoGrande,
  DocumentoNoEncontrado,
  DocumentoSinAsociacion,
  eliminarDocumento,
  FormatoDocumentoNoSoportado,
  MAXIMO_BYTES_DOCUMENTO,
  reemplazarVersionDocumento,
  registrarFeedbackRespuesta,
  TIPOS_ARCHIVO_DOCUMENTO,
  type TipoArchivoDocumento,
} from "@forja/core";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "../auth/composicion";
import { requiereRol, requiereSesion } from "../auth/middleware";
import type { ComposicionRuntime } from "../runtime/composicion";

const camposAsociaciones = z.object({
  maquinaIds: z.array(z.string()).default([]),
  areaIds: z.array(z.string()).default([]),
  familiaIds: z.array(z.string()).default([]),
});

const paramsDocumento = z.object({ id: z.string().uuid() });
const queryListarDocumentos = z.object({ maquina: z.string().optional(), area: z.string().optional() });
const cuerpoFeedback = z.object({ traceId: z.string().uuid(), util: z.boolean() });

type ArchivoMultipart = Exclude<Awaited<ReturnType<FastifyRequest["file"]>>, undefined>;

function inferirTipoArchivo(nombreArchivo: string): TipoArchivoDocumento | null {
  const extension = nombreArchivo.split(".").pop()?.toLowerCase();
  return (TIPOS_ARCHIVO_DOCUMENTO as readonly string[]).includes(extension ?? "")
    ? (extension as TipoArchivoDocumento)
    : null;
}

function campoTexto(archivo: ArchivoMultipart, nombre: string): string | undefined {
  const campo = archivo.fields[nombre];
  if (!campo || Array.isArray(campo) || campo.type !== "field") return undefined;
  return typeof campo.value === "string" ? campo.value : undefined;
}

function campoJson(archivo: ArchivoMultipart, nombre: string): unknown {
  const valor = campoTexto(archivo, nombre);
  if (valor === undefined) return undefined;
  try {
    return JSON.parse(valor);
  } catch {
    return undefined;
  }
}

export function registrarRutasDocumentos(app: FastifyInstance, auth: ComposicionAuth, runtime: ComposicionRuntime): void {
  const soloAdmin = requiereRol(auth, "admin");

  app.post("/api/documentos", { preHandler: soloAdmin }, async (request, reply) => {
    const archivo = await request.file({ limits: { fileSize: MAXIMO_BYTES_DOCUMENTO } });
    if (!archivo) return reply.status(400).send({ error: "solicitud_invalida" });

    const tipoArchivo = inferirTipoArchivo(archivo.filename);
    if (!tipoArchivo) {
      return reply.status(400).send({ error: new FormatoDocumentoNoSoportado().codigo });
    }

    const asociaciones = camposAsociaciones.safeParse({
      maquinaIds: campoJson(archivo, "maquinaIds") ?? [],
      areaIds: campoJson(archivo, "areaIds") ?? [],
      familiaIds: campoJson(archivo, "familiaIds") ?? [],
    });
    if (!asociaciones.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const contenido = await archivo.toBuffer();
    const documentoAnteriorId = campoTexto(archivo, "documentoAnteriorId");

    try {
      if (documentoAnteriorId) {
        const documento = await reemplazarVersionDocumento(
          {
            documentos: runtime.documentos,
            chunks: runtime.chunks,
            almacen: runtime.almacen,
            cola: runtime.cola,
            generarId: runtime.generarId,
          },
          {
            documentoAnteriorId,
            nombre: archivo.filename,
            tipoArchivo,
            contenido,
            subidoPor: request.usuarioActual!.id,
            ahora: new Date(),
          },
        );
        return reply.status(201).send({ documento });
      }

      const documento = await cargarDocumento(
        { documentos: runtime.documentos, almacen: runtime.almacen, cola: runtime.cola, generarId: runtime.generarId },
        {
          nombre: archivo.filename,
          tipoArchivo,
          contenido,
          asociaciones: asociaciones.data,
          subidoPor: request.usuarioActual!.id,
          ahora: new Date(),
        },
      );
      return reply.status(201).send({ documento });
    } catch (error) {
      if (error instanceof DocumentoSinAsociacion || error instanceof DocumentoDemasiadoGrande) {
        return reply.status(400).send({ error: error.codigo });
      }
      if (error instanceof DocumentoNoEncontrado) return reply.status(404).send({ error: error.codigo });
      throw error;
    }
  });

  app.get("/api/documentos", { preHandler: soloAdmin }, async (request, reply) => {
    const query = queryListarDocumentos.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const documentos = await runtime.documentos.listar({
      ...(query.data.maquina !== undefined ? { maquinaId: query.data.maquina } : {}),
      ...(query.data.area !== undefined ? { areaId: query.data.area } : {}),
    });
    return reply.status(200).send({ documentos });
  });

  app.delete("/api/documentos/:id", { preHandler: soloAdmin }, async (request, reply) => {
    const params = paramsDocumento.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "solicitud_invalida" });

    try {
      await eliminarDocumento({ documentos: runtime.documentos, chunks: runtime.chunks }, { id: params.data.id });
      return reply.status(200).send({ ok: true });
    } catch (error) {
      if (error instanceof DocumentoNoEncontrado) return reply.status(404).send({ error: error.codigo });
      throw error;
    }
  });

  app.post("/api/feedback", { preHandler: requiereSesion(auth) }, async (request, reply) => {
    const cuerpo = cuerpoFeedback.safeParse(request.body);
    if (!cuerpo.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const feedback = await registrarFeedbackRespuesta(
      { feedback: runtime.feedback, generarId: runtime.generarId },
      { traceId: cuerpo.data.traceId, util: cuerpo.data.util, ahora: new Date() },
    );
    return reply.status(201).send({ feedback });
  });
}
