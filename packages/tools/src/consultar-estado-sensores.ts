import {
  listarSensoresMudos,
  type DependenciasListarSensoresMudos,
  type Herramienta,
  type SensorMudo,
} from "@forja/core";
import { z } from "zod";

const schema = z.object({ maquinaId: z.string().min(1).optional() });

export type ParametrosHerramientaConsultarEstadoSensores = z.infer<typeof schema>;

export interface ResultadoHerramientaConsultarEstadoSensores {
  sensoresMudos: readonly SensorMudo[];
}

/**
 * Expone qué sensores están "mudos" (sin lecturas recientes, config. por
 * sensor). Mismo control de acceso por área que consultar_sensores: un
 * operador sin maquinaId solo ve sus áreas asignadas.
 */
export function crearHerramientaConsultarEstadoSensores(
  deps: DependenciasListarSensoresMudos,
): Herramienta<ParametrosHerramientaConsultarEstadoSensores, ResultadoHerramientaConsultarEstadoSensores> {
  return {
    nombre: "consultar_estado_sensores",
    descripcion:
      "Lista los sensores 'mudos' (sin lecturas recientes) de una máquina, o de todas las máquinas visibles para " +
      "el usuario si se omite maquinaId. Útil para responder '¿algún sensor dejó de reportar?'.",
    rolesPermitidos: ["operador", "supervisor", "admin"],
    schema,
    async execute(parametros, ctx) {
      const sensoresMudos = await listarSensoresMudos(deps, {
        usuario: ctx.usuario,
        ahora: new Date(),
        ...(parametros.maquinaId !== undefined ? { maquinaId: parametros.maquinaId } : {}),
      });
      return { sensoresMudos };
    },
  };
}
