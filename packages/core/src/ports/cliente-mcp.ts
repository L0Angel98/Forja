/**
 * Adaptador (patrón Adapter) sobre un cliente MCP real, propio o in-process.
 * `listarHerramientas` devuelve la respuesta cruda de `tools/list` tal cual
 * la entrega el protocolo (un objeto por herramienta, con al menos `name`,
 * `description`, `inputSchema` y opcionalmente `annotations.readOnlyHint`)
 * para que `validarManifiestoConector` (core) la valide con Zod — así un
 * servidor MCP mal formado no puede colar un manifiesto inválido sin que
 * el loader lo detecte.
 */
export interface ClienteMcp {
  listarHerramientas(): Promise<readonly Record<string, unknown>[]>;
  invocar(nombreHerramienta: string, parametros: Record<string, unknown>): Promise<string>;
  cerrar(): Promise<void>;
}
