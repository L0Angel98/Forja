import { ConectorDesconocido, ConectorNoDisponible, confirmarAccionConector, PermisoDenegado } from "@forja/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "../auth/composicion";
import { requiereRol, requiereSesion } from "../auth/middleware";
import type { ComposicionRuntime } from "../runtime/composicion";

const paramsAccionConector = z.object({ conector: z.string().min(1), herramienta: z.string().min(1) });
const cuerpoConfirmar = z.object({ parametros: z.record(z.string(), z.unknown()).default({}) });

/**
 * El "click humano" de spec 17: toda escritura de un conector que el
 * agente propuso (BorradorAccionConector) solo se ejecuta de verdad
 * cuando el usuario confirma aquí. La ruta solo exige sesión — el rol
 * exacto que puede confirmar cada herramienta ya lo decide
 * confirmarAccionConector contra los permisos de conectores.yaml, igual
 * que RegistroHerramientas.disponiblesPara filtra por rol para el chat.
 */
export function registrarRutasConectores(app: FastifyInstance, auth: ComposicionAuth, runtime: ComposicionRuntime): void {
  app.get("/api/admin/conectores", { preHandler: requiereRol(auth, "admin") }, async (_request, reply) => {
    return reply.status(200).send({ conectores: runtime.conectores.obtenerEstados() });
  });

  app.post(
    "/api/conectores/:conector/:herramienta/confirmar",
    { preHandler: requiereSesion(auth) },
    async (request, reply) => {
      const params = paramsAccionConector.safeParse(request.params);
      const cuerpo = cuerpoConfirmar.safeParse(request.body);
      if (!params.success || !cuerpo.success) return reply.status(400).send({ error: "solicitud_invalida" });

      try {
        const resultado = await confirmarAccionConector(
          { registro: runtime.conectores, trace: runtime.trace },
          {
            usuario: request.usuarioActual!,
            plantId: runtime.plantId,
            conector: params.data.conector,
            herramienta: params.data.herramienta,
            parametros: cuerpo.data.parametros,
          },
        );
        return reply.status(200).send({ resultado });
      } catch (error) {
        if (error instanceof ConectorDesconocido) return reply.status(404).send({ error: error.codigo });
        if (error instanceof PermisoDenegado) return reply.status(403).send({ error: error.codigo });
        if (error instanceof ConectorNoDisponible) return reply.status(503).send({ error: error.codigo });
        if (error instanceof Error) return reply.status(502).send({ error: error.message });
        throw error;
      }
    },
  );
}
