import { z } from "zod";
import type { BorradorAccionConector, HerramientaConectorManifiesto } from "../entities/conector";
import type { Herramienta } from "../entities/herramienta";
import type { Rol } from "../entities/usuario";

export interface DependenciasConstruirHerramientaConector {
  invocar(nombreHerramienta: string, parametros: Record<string, unknown>): Promise<string>;
}

const schemaParametros = z.record(z.string(), z.unknown());

/**
 * Convierte una entrada del manifiesto de un conector en una Herramienta
 * del agente (patrón Adapter). Regla global de escrituras externas (spec
 * 17): una herramienta con esEscritura:true NUNCA llama al cliente MCP
 * desde aquí — solo arma un BorradorAccionConector, igual que
 * crear_reporte_falla (spec 13) nunca persiste directamente. Por eso
 * soloLectura es true en ambos casos: ni la de lectura ni la de escritura
 * mutan nada por sí solas, así que ambas son seguras para rutinas (spec
 * 16, "solo generan borradores"). El schema es un passthrough genérico
 * porque la validación real de parámetros la hace el servidor MCP contra
 * su propio inputSchema (JSON Schema), no esta capa zod.
 */
export function construirHerramientaConector(
  nombreConector: string,
  herramienta: HerramientaConectorManifiesto,
  rolesPermitidos: readonly Rol[],
  deps: DependenciasConstruirHerramientaConector,
): Herramienta<Record<string, unknown>, string | BorradorAccionConector> {
  return {
    nombre: herramienta.nombre,
    descripcion: herramienta.descripcion,
    rolesPermitidos,
    soloLectura: true,
    schema: schemaParametros,
    async execute(parametros) {
      if (herramienta.esEscritura) {
        return { conector: nombreConector, herramienta: herramienta.nombre, parametros };
      }
      return deps.invocar(herramienta.nombre, parametros);
    },
  };
}
