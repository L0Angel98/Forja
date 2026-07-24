import {
  BUCKETS,
  consultarSensores,
  MaquinaFueraDeArea,
  MaquinaNoEncontrada,
  RangoConsultaDemasiadoAmplio,
  SensorNoEncontrado,
  TIPOS_AGREGACION,
} from "@forja/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "../auth/composicion";
import { requiereSesion } from "../auth/middleware";
import type { ComposicionRuntime } from "../runtime/composicion";

const paramsSensor = z.object({ id: z.string().min(1) });

const queryLecturas = z.object({
  agg: z.enum(TIPOS_AGREGACION),
  bucket: z.enum(BUCKETS),
  desde: z.string().datetime(),
  hasta: z.string().datetime(),
});

/**
 * Misma plantilla que la herramienta `consultar_sensores` (spec 15): el
 * `:id` de la URL es el sensor, no la máquina — la máquina se resuelve del
 * catálogo para reutilizar exactamente el mismo control de acceso por área.
 * La UI de admin usa esta ruta para las mini-gráficas.
 */
export function registrarRutasSensores(app: FastifyInstance, auth: ComposicionAuth, runtime: ComposicionRuntime): void {
  const conSesion = requiereSesion(auth);

  app.get("/api/sensores/:id/lecturas", { preHandler: conSesion }, async (request, reply) => {
    const params = paramsSensor.safeParse(request.params);
    const query = queryLecturas.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ error: "solicitud_invalida" });

    const sensor = await runtime.catalogoSensores.buscarPorId(params.data.id);
    if (!sensor) return reply.status(404).send({ error: new SensorNoEncontrado().codigo });

    try {
      const [serie] = await consultarSensores(
        {
          maquinas: runtime.maquinas,
          areasUsuario: runtime.areasUsuario,
          catalogo: runtime.catalogoSensores,
          agregaciones: runtime.agregacionesSensores,
        },
        {
          usuario: request.usuarioActual!,
          maquinaId: sensor.machineId,
          sensorId: sensor.id,
          agregacion: query.data.agg,
          bucket: query.data.bucket,
          desde: new Date(query.data.desde),
          hasta: new Date(query.data.hasta),
        },
      );
      return reply.status(200).send({ serie });
    } catch (error) {
      if (error instanceof RangoConsultaDemasiadoAmplio) return reply.status(400).send({ error: error.codigo });
      if (error instanceof MaquinaNoEncontrada || error instanceof SensorNoEncontrado) {
        return reply.status(404).send({ error: error.codigo });
      }
      if (error instanceof MaquinaFueraDeArea) return reply.status(403).send({ error: error.codigo });
      throw error;
    }
  });
}
