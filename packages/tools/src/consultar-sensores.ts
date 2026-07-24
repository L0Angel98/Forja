import {
  BUCKETS,
  consultarSensores,
  TIPOS_AGREGACION,
  type DependenciasConsultarSensores,
  type Herramienta,
  type SerieAgregada,
} from "@forja/core";
import { z } from "zod";

const schema = z.object({
  maquinaId: z.string().min(1),
  sensorId: z.string().optional(),
  agregacion: z.enum(TIPOS_AGREGACION),
  bucket: z.enum(BUCKETS),
  desde: z.string().datetime(),
  hasta: z.string().datetime(),
});

export type ParametrosHerramientaConsultarSensores = z.infer<typeof schema>;

export interface ResultadoHerramientaConsultarSensores {
  series: readonly SerieAgregada[];
}

/**
 * El LLM nunca genera SQL (spec 15): solo elige entre las agregaciones y
 * buckets del enum cerrado, y todo se traduce a plantillas Drizzle
 * parametrizadas sobre continuous aggregates. Si el rango pedido es
 * ambiguo ("últimamente"), es responsabilidad del agente asumir 7 días y
 * decirlo explícitamente al usuario — la herramienta solo ejecuta lo que
 * se le pide.
 */
export function crearHerramientaConsultarSensores(
  deps: DependenciasConsultarSensores,
): Herramienta<ParametrosHerramientaConsultarSensores, ResultadoHerramientaConsultarSensores> {
  return {
    nombre: "consultar_sensores",
    descripcion:
      "Consulta series agregadas de sensores de una máquina en un rango de tiempo. Agregación: min|max|avg|count|last. " +
      "Bucket: 5m|1h|1d. Si el bucket pedido produce más de 500 puntos, se re-bucketiza automáticamente a uno más " +
      "grueso (dilo si `reBucketizado` viene en true). No sirve para datos crudos ni para escribir nada.",
    rolesPermitidos: ["operador", "supervisor", "admin"],
    schema,
    async execute(parametros, ctx) {
      const series = await consultarSensores(deps, {
        usuario: ctx.usuario,
        maquinaId: parametros.maquinaId,
        ...(parametros.sensorId !== undefined ? { sensorId: parametros.sensorId } : {}),
        agregacion: parametros.agregacion,
        bucket: parametros.bucket,
        desde: new Date(parametros.desde),
        hasta: new Date(parametros.hasta),
      });
      return { series };
    },
  };
}
