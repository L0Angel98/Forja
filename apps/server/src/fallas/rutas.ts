import {
  cambiarEstadoFalla,
  crearReporteFalla,
  ESTADOS_FALLA,
  MaquinaFueraDeArea,
  MaquinaNoEncontrada,
  ReporteFallaNoEncontrado,
  SINTOMAS_TAXONOMIA,
  DemasiadasFotos,
  SintomaRequerido,
  TransicionEstadoInvalida,
} from "@forja/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "../auth/composicion";
import { requiereRol, requiereSesion } from "../auth/middleware";
import type { ComposicionRuntime } from "../runtime/composicion";

const cuerpoCrearFalla = z.object({
  machineId: z.string().min(1),
  sintomaTaxonomia: z.enum(SINTOMAS_TAXONOMIA).optional(),
  sintomaOtro: z.string().min(1).max(500).optional(),
  descripcion: z.string().min(1).max(2000),
  severidad: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  fotos: z.array(z.string()).max(5).optional().default([]),
  origen: z.enum(["agente", "formulario"]).optional().default("formulario"),
});

const queryListarFallas = z.object({
  machineId: z.string().optional(),
  estado: z.enum(ESTADOS_FALLA).optional(),
  severidad: z.coerce.number().optional(),
});

const paramsFalla = z.object({ id: z.string().uuid() });
const cuerpoCambiarEstado = z.object({ estado: z.enum(ESTADOS_FALLA) });

export function registrarRutasFallas(app: FastifyInstance, auth: ComposicionAuth, runtime: ComposicionRuntime): void {
  const conSesion = requiereSesion(auth);

  app.post("/api/fallas", { preHandler: conSesion }, async (request, reply) => {
    const cuerpo = cuerpoCrearFalla.safeParse(request.body);
    if (!cuerpo.success) return reply.status(400).send({ error: "solicitud_invalida" });

    try {
      const reporte = await crearReporteFalla(
        { maquinas: runtime.maquinas, areasUsuario: runtime.areasUsuario, fallas: runtime.fallas, bus: runtime.bus, generarId: runtime.generarId },
        {
          usuario: request.usuarioActual!,
          machineId: cuerpo.data.machineId,
          ...(cuerpo.data.sintomaTaxonomia !== undefined ? { sintomaTaxonomia: cuerpo.data.sintomaTaxonomia } : {}),
          ...(cuerpo.data.sintomaOtro !== undefined ? { sintomaOtro: cuerpo.data.sintomaOtro } : {}),
          descripcion: cuerpo.data.descripcion,
          severidad: cuerpo.data.severidad,
          fotos: cuerpo.data.fotos,
          origen: cuerpo.data.origen,
          ahora: new Date(),
        },
      );
      return reply.status(201).send({ reporte });
    } catch (error) {
      if (error instanceof SintomaRequerido || error instanceof DemasiadasFotos) {
        return reply.status(400).send({ error: error.codigo });
      }
      if (error instanceof MaquinaNoEncontrada) return reply.status(404).send({ error: error.codigo });
      if (error instanceof MaquinaFueraDeArea) return reply.status(403).send({ error: error.codigo });
      throw error;
    }
  });

  app.get("/api/fallas", { preHandler: conSesion }, async (request, reply) => {
    const query = queryListarFallas.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const usuario = request.usuarioActual!;
    const areaIds = usuario.rol === "operador" ? await runtime.areasUsuario.areasDe(usuario.id) : undefined;

    const fallas = await runtime.fallas.listar({
      ...(areaIds !== undefined ? { areaIds } : {}),
      ...(query.data.machineId !== undefined ? { machineId: query.data.machineId } : {}),
      ...(query.data.estado !== undefined ? { estado: query.data.estado } : {}),
      ...(query.data.severidad !== undefined ? { severidad: query.data.severidad } : {}),
    });
    return reply.status(200).send({ fallas });
  });

  app.patch(
    "/api/fallas/:id/estado",
    { preHandler: requiereRol(auth, "supervisor", "admin") },
    async (request, reply) => {
      const params = paramsFalla.safeParse(request.params);
      const cuerpo = cuerpoCambiarEstado.safeParse(request.body);
      if (!params.success || !cuerpo.success) return reply.status(400).send({ error: "solicitud_invalida" });

      try {
        const reporte = await cambiarEstadoFalla(
          { fallas: runtime.fallas },
          { id: params.data.id, siguiente: cuerpo.data.estado },
        );
        return reply.status(200).send({ reporte });
      } catch (error) {
        if (error instanceof ReporteFallaNoEncontrado) return reply.status(404).send({ error: error.codigo });
        if (error instanceof TransicionEstadoInvalida) return reply.status(409).send({ error: error.codigo });
        throw error;
      }
    },
  );
}
