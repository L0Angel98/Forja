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
  readonly schema: z.ZodType<TParametros>;
  execute(parametros: TParametros, ctx: ContextoHerramienta): Promise<TResultado>;
}
