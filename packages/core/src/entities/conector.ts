import type { Rol } from "./usuario";

/**
 * No hay un documento de manifiesto aparte: se deriva y valida (Zod, ver
 * validarManifiestoConector) directamente de la respuesta real de
 * listTools() del cliente MCP — nombre, descripción, inputSchema y
 * `esEscritura = !annotations.readOnlyHint` son exactamente lo que el
 * protocolo estándar ya expone para que un cliente descubra herramientas.
 */
export interface HerramientaConectorManifiesto {
  readonly nombre: string;
  readonly descripcion: string;
  readonly esEscritura: boolean;
  readonly schemaEntrada: Record<string, unknown>;
}

export interface ManifiestoConector {
  readonly nombre: string;
  readonly version: string;
  readonly herramientas: readonly HerramientaConectorManifiesto[];
}

export const ESTADOS_CONECTOR = ["disponible", "no_disponible"] as const;
export type EstadoConector = (typeof ESTADOS_CONECTOR)[number];

/** Una entrada de `workspace/conectores.yaml`. */
export interface ConectorConfigurado {
  readonly nombre: string;
  readonly activo: boolean;
  /** herramienta -> roles que pueden usarla. */
  readonly permisos: Readonly<Record<string, readonly Rol[]>>;
  /** clave de credencial -> NOMBRE de variable de entorno (nunca el secreto). */
  readonly credenciales: Readonly<Record<string, string>>;
  /** solo aplica al conector `webhook`: URLs permitidas. */
  readonly listaBlancaUrls: readonly string[];
}

/**
 * Lo que produce una herramienta de conector con `esEscritura: true` cuando
 * el agente la invoca: nunca se ejecuta de verdad ahí (igual que
 * crear_reporte_falla, spec 13). Un humano debe confirmarla explícitamente
 * (POST .../confirmar) para que se llame al cliente MCP real.
 */
export interface BorradorAccionConector {
  readonly conector: string;
  readonly herramienta: string;
  readonly parametros: Record<string, unknown>;
}
