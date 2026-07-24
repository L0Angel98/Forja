import type { ManifiestoConector } from "../entities/conector";
import type { Rol } from "../entities/usuario";
import type { ClienteMcp } from "./cliente-mcp";

export interface ConectorActivo {
  readonly manifiesto: ManifiestoConector;
  readonly permisos: Readonly<Record<string, readonly Rol[]>>;
  readonly cliente: ClienteMcp;
}

/** Consultado por confirmarAccionConector para invocar el cliente MCP real tras el click humano. */
export interface RegistroConectoresActivos {
  obtener(nombreConector: string): ConectorActivo | undefined;
}
