import {
  prepararBorradorReporteFalla,
  SINTOMAS_TAXONOMIA,
  type BorradorReporteFalla,
  type DependenciasPrepararBorradorReporteFalla,
  type Herramienta,
} from "@forja/core";
import { z } from "zod";

const schema = z.object({
  machineId: z.string().min(1),
  sintomaTaxonomia: z.enum(SINTOMAS_TAXONOMIA).optional(),
  sintomaOtro: z.string().min(1).max(500).optional(),
  descripcion: z.string().min(1).max(2000),
  severidad: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  fotos: z.array(z.string()).max(5),
});

export type ParametrosHerramientaCrearReporteFalla = z.infer<typeof schema>;

/**
 * Herramienta del agente para reportar una falla. Nunca persiste: solo
 * valida y arma un borrador. La confirmación es un click real del usuario
 * en el formulario (POST /api/fallas), nunca una decisión del LLM.
 */
export function crearHerramientaCrearReporteFalla(
  deps: DependenciasPrepararBorradorReporteFalla,
): Herramienta<ParametrosHerramientaCrearReporteFalla, BorradorReporteFalla> {
  return {
    nombre: "crear_reporte_falla",
    descripcion:
      "Valida y arma un borrador de reporte de falla para una máquina a partir de una descripción conversacional. " +
      "No lo persiste: el usuario debe confirmarlo en el formulario antes de que se registre.",
    rolesPermitidos: ["operador", "supervisor", "admin"],
    // Nunca persiste (ver comentario de la función): un borrador pendiente de confirmación humana
    // no muta estado, así que spec 16 la trata como segura para rutinas automáticas.
    soloLectura: true,
    schema,
    async execute(parametros, ctx) {
      return prepararBorradorReporteFalla(deps, {
        usuario: ctx.usuario,
        machineId: parametros.machineId,
        ...(parametros.sintomaTaxonomia !== undefined ? { sintomaTaxonomia: parametros.sintomaTaxonomia } : {}),
        ...(parametros.sintomaOtro !== undefined ? { sintomaOtro: parametros.sintomaOtro } : {}),
        descripcion: parametros.descripcion,
        severidad: parametros.severidad,
        fotos: parametros.fotos,
      });
    },
  };
}
