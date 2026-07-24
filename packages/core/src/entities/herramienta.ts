import type { z } from "zod";
import type { Rol } from "./usuario";
import type { Usuario } from "./usuario";

export interface ContextoHerramienta {
  readonly usuario: Usuario;
  readonly plantId: string;
  readonly traceId: string;
}

/** Patrón Command (ver 01-estandares.md): una herramienta del agente. */
export interface Herramienta<TParametros = unknown, TResultado = unknown> {
  readonly nombre: string;
  readonly descripcion: string;
  readonly rolesPermitidos: readonly Rol[];
  /** true si nunca escribe/muta nada (ni directo ni vía borrador pendiente de aprobación) — spec 16: rutinas solo pueden listar herramientas de solo lectura. */
  readonly soloLectura: boolean;
  readonly schema: z.ZodType<TParametros>;
  execute(parametros: TParametros, ctx: ContextoHerramienta): Promise<TResultado>;
}
