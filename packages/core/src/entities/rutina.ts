import type { Rol } from "./usuario";

/**
 * Rol con el que se ejecuta una rutina: siempre de solo lectura por
 * construcción (spec 16). El sufijo -lectura es el valor literal que
 * declara el frontmatter; rolBaseDeRutina lo traduce al Rol real para
 * reutilizar el filtrado por área ya existente (spec 13/14/15).
 */
export const ROLES_RUTINA = ["operador-lectura", "supervisor-lectura", "admin-lectura"] as const;
export type RolRutina = (typeof ROLES_RUTINA)[number];

export function rolBaseDeRutina(rol: RolRutina): Rol {
  return rol.replace(/-lectura$/, "") as Rol;
}

/** Canales de salida (patrón Strategy): agregar uno nuevo no toca el scheduler. */
export type CanalSalida =
  | { readonly tipo: "correo"; readonly grupo: string }
  | { readonly tipo: "webhook"; readonly url: string }
  | { readonly tipo: "ui" };

const PREFIJO_CORREO = "correo:";
const PREFIJO_WEBHOOK = "webhook:";

export function parsearCanalSalida(valor: string): CanalSalida | null {
  if (valor === "ui") return { tipo: "ui" };

  if (valor.startsWith(PREFIJO_CORREO)) {
    const grupo = valor.slice(PREFIJO_CORREO.length).trim();
    return grupo.length > 0 ? { tipo: "correo", grupo } : null;
  }

  if (valor.startsWith(PREFIJO_WEBHOOK)) {
    const url = valor.slice(PREFIJO_WEBHOOK.length).trim();
    try {
      void new URL(url);
      return { tipo: "webhook", url };
    } catch {
      return null;
    }
  }

  return null;
}

export function formatearCanalSalida(canal: CanalSalida): string {
  switch (canal.tipo) {
    case "correo":
      return `${PREFIJO_CORREO}${canal.grupo}`;
    case "webhook":
      return `${PREFIJO_WEBHOOK}${canal.url}`;
    case "ui":
      return "ui";
  }
}

/** Rutina ya parseada y validada a partir del frontmatter de workspace/rutinas/{nombre}.md. */
export interface RutinaProgramada {
  readonly nombre: string;
  readonly cron: string;
  readonly rol: RolRutina;
  readonly herramientas: readonly string[];
  readonly salida: CanalSalida;
  readonly presupuestoTokens: number;
  readonly activa: boolean;
  /** Cuerpo del markdown después del frontmatter: el prompt que ejecuta la rutina. */
  readonly prompt: string;
}
