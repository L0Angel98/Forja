import {
  aprobarSugerenciaMemoria,
  ArchivoWorkspaceDemasiadoGrande,
  editarArchivoWorkspace,
  rechazarSugerenciaMemoria,
  SugerenciaMemoriaNoEncontrada,
  SugerenciaMemoriaYaResuelta,
} from "@forja/core";
import { ejecutarTurno } from "@forja/runtime";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "../auth/composicion";
import { requiereRol, requiereSesion } from "../auth/middleware";
import type { ComposicionRuntime } from "./composicion";

const cuerpoEditarArchivo = z.object({ contenido: z.string() });
const paramsArchivo = z.object({ archivo: z.enum(["soul", "planta"]) });
const paramsSugerencia = z.object({ id: z.string().uuid() });

const mensajeConversacionSchema = z.object({
  rol: z.enum(["usuario", "agente", "herramienta"]),
  contenido: z.string(),
  nombreHerramienta: z.string().optional(),
});
const cuerpoChat = z.object({
  mensaje: z.string().min(1),
  historial: z.array(mensajeConversacionSchema).optional().default([]),
});

export function registrarRutasRuntime(
  app: FastifyInstance,
  auth: ComposicionAuth,
  runtime: ComposicionRuntime,
): void {
  const soloAdmin = requiereRol(auth, "admin");

  app.post("/api/chat", { preHandler: requiereSesion(auth) }, async (request, reply) => {
    const cuerpo = cuerpoChat.safeParse(request.body);
    if (!cuerpo.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const config = runtime.workspaceLoader.obtenerConfiguracion();
    const systemPrompt = [config.soul, config.planta, config.memoria].filter((s) => s.trim().length > 0).join("\n\n");
    const historial = cuerpo.data.historial.map((m) =>
      m.nombreHerramienta !== undefined
        ? { rol: m.rol, contenido: m.contenido, nombreHerramienta: m.nombreHerramienta }
        : { rol: m.rol, contenido: m.contenido },
    );

    const resultado = await ejecutarTurno(
      { registro: runtime.registroHerramientas, llm: runtime.llm, trace: runtime.trace },
      {
        usuario: request.usuarioActual!,
        plantId: runtime.plantId,
        mensaje: cuerpo.data.mensaje,
        historial,
        systemPrompt,
        traceId: runtime.generarId(),
      },
    );

    return reply.status(200).send(resultado);
  });

  app.get("/api/admin/workspace", { preHandler: soloAdmin }, async (_request, reply) => {
    const config = runtime.workspaceLoader.obtenerConfiguracion();
    return reply.status(200).send({
      soul: config.soul,
      planta: config.planta,
      advertencias: config.advertencias,
      archivosInvalidos: config.archivosInvalidos,
    });
  });

  app.put("/api/admin/workspace/:archivo", { preHandler: soloAdmin }, async (request, reply) => {
    const params = paramsArchivo.safeParse(request.params);
    const cuerpo = cuerpoEditarArchivo.safeParse(request.body);
    if (!params.success || !cuerpo.success) {
      return reply.status(400).send({ error: "solicitud_invalida" });
    }

    try {
      const resultado = await editarArchivoWorkspace(
        { workspace: runtime.escritorWorkspace, auditoria: auth.auditoria },
        {
          archivo: params.data.archivo,
          contenidoNuevo: cuerpo.data.contenido,
          adminId: request.usuarioActual!.id,
          ip: request.ip,
          ahora: new Date(),
        },
      );
      await runtime.workspaceLoader.recargar();
      return reply.status(200).send({ diff: resultado.diff });
    } catch (error) {
      if (error instanceof ArchivoWorkspaceDemasiadoGrande) {
        return reply.status(413).send({ error: error.codigo });
      }
      throw error;
    }
  });

  app.get("/api/admin/memoria/sugerencias", { preHandler: soloAdmin }, async (_request, reply) => {
    const sugerencias = await runtime.sugerenciasMemoria.listarPendientes();
    return reply.status(200).send({ sugerencias });
  });

  app.post(
    "/api/admin/memoria/sugerencias/:id/aprobar",
    { preHandler: soloAdmin },
    async (request, reply) => {
      const params = paramsSugerencia.safeParse(request.params);
      if (!params.success) return reply.status(400).send({ error: "solicitud_invalida" });

      try {
        await aprobarSugerenciaMemoria(
          {
            sugerencias: runtime.sugerenciasMemoria,
            escritorMemoria: runtime.escritorMemoria,
            auditoria: auth.auditoria,
          },
          { sugerenciaId: params.data.id, adminId: request.usuarioActual!.id, ip: request.ip, ahora: new Date() },
        );
        return reply.status(200).send({ ok: true });
      } catch (error) {
        if (error instanceof SugerenciaMemoriaNoEncontrada) return reply.status(404).send({ error: error.codigo });
        if (error instanceof SugerenciaMemoriaYaResuelta) return reply.status(409).send({ error: error.codigo });
        throw error;
      }
    },
  );

  app.post(
    "/api/admin/memoria/sugerencias/:id/rechazar",
    { preHandler: soloAdmin },
    async (request, reply) => {
      const params = paramsSugerencia.safeParse(request.params);
      if (!params.success) return reply.status(400).send({ error: "solicitud_invalida" });

      try {
        await rechazarSugerenciaMemoria(
          { sugerencias: runtime.sugerenciasMemoria, auditoria: auth.auditoria },
          { sugerenciaId: params.data.id, adminId: request.usuarioActual!.id, ip: request.ip, ahora: new Date() },
        );
        return reply.status(200).send({ ok: true });
      } catch (error) {
        if (error instanceof SugerenciaMemoriaNoEncontrada) return reply.status(404).send({ error: error.codigo });
        if (error instanceof SugerenciaMemoriaYaResuelta) return reply.status(409).send({ error: error.codigo });
        throw error;
      }
    },
  );
}
