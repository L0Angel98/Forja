import { parsearRutina, RutinaNoEncontrada } from "@forja/core";
import { ErrorDominio } from "@forja/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "../auth/composicion";
import { requiereRol } from "../auth/middleware";
import type { ComposicionRuntime } from "../runtime/composicion";

const NOMBRE_VALIDO = /^[a-z0-9-]+$/;

const paramsRutina = z.object({ nombre: z.string().regex(NOMBRE_VALIDO) });
const cuerpoEscribirRutina = z.object({ contenido: z.string().min(1) });
const queryHistorial = z.object({ limite: z.coerce.number().int().positive().max(200).optional().default(50) });

/**
 * CRUD de rutinas (spec 16): las rutinas viven como .md en
 * workspace/rutinas/*, igual que soul.md/planta.md. `escritorRutinas` es
 * el único punto de escritura en disco; `programadorRutinas.recargar()`
 * se llama tras cada escritura/borrado para que el scheduler refleje el
 * cambio sin esperar al watcher del WorkspaceLoader.
 */
export function registrarRutasRutinas(app: FastifyInstance, auth: ComposicionAuth, runtime: ComposicionRuntime): void {
  const soloAdmin = requiereRol(auth, "admin");

  app.get("/api/admin/rutinas", { preHandler: soloAdmin }, async (_request, reply) => {
    return reply.status(200).send({
      rutinas: runtime.programadorRutinas.obtenerEstado(),
      erroresCarga: runtime.programadorRutinas.obtenerErroresCarga(),
    });
  });

  app.get("/api/admin/rutinas/:nombre", { preHandler: soloAdmin }, async (request, reply) => {
    const params = paramsRutina.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const contenido = await runtime.escritorRutinas.leer(params.data.nombre);
    if (contenido === null) return reply.status(404).send({ error: new RutinaNoEncontrada().codigo });

    return reply.status(200).send({ contenido });
  });

  app.put("/api/admin/rutinas/:nombre", { preHandler: soloAdmin }, async (request, reply) => {
    const params = paramsRutina.safeParse(request.params);
    const cuerpo = cuerpoEscribirRutina.safeParse(request.body);
    if (!params.success || !cuerpo.success) return reply.status(400).send({ error: "solicitud_invalida" });

    let rutina;
    try {
      rutina = parsearRutina(
        { catalogoHerramientas: runtime.registroHerramientas, presupuestoMaximoGlobal: runtime.presupuestoMaximoPorEjecucion },
        { contenidoArchivo: cuerpo.data.contenido },
      );
    } catch (error) {
      if (error instanceof ErrorDominio) return reply.status(400).send({ error: error.codigo });
      throw error;
    }

    if (rutina.nombre !== params.data.nombre) {
      return reply.status(400).send({ error: "rutina_nombre_no_coincide_con_la_url" });
    }

    await runtime.escritorRutinas.escribir(params.data.nombre, cuerpo.data.contenido);
    await runtime.programadorRutinas.recargar();
    return reply.status(200).send({ rutina });
  });

  app.delete("/api/admin/rutinas/:nombre", { preHandler: soloAdmin }, async (request, reply) => {
    const params = paramsRutina.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: "solicitud_invalida" });

    await runtime.escritorRutinas.eliminar(params.data.nombre);
    await runtime.programadorRutinas.recargar();
    return reply.status(200).send({ ok: true });
  });

  app.get("/api/admin/rutinas/:nombre/historial", { preHandler: soloAdmin }, async (request, reply) => {
    const params = paramsRutina.safeParse(request.params);
    const query = queryHistorial.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const ejecuciones = await runtime.ejecucionesRutina.listarPorRutina(params.data.nombre, query.data.limite);
    return reply.status(200).send({ ejecuciones });
  });
}
