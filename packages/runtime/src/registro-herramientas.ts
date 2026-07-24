import type { Rol } from "@forja/core";

export interface HerramientaRegistrada {
  readonly nombre: string;
  readonly descripcion: string;
  readonly rolesPermitidos: readonly Rol[];
}

/**
 * Registry (patrón Registry) de herramientas del agente, filtradas por rol.
 * El loop del agente y las herramientas concretas llegan en la spec 12; este
 * registro es la pieza reutilizable que ambas van a consumir.
 */
export class RegistroHerramientas {
  private readonly herramientas = new Map<string, HerramientaRegistrada>();

  registrar(herramienta: HerramientaRegistrada): void {
    if (this.herramientas.has(herramienta.nombre)) {
      throw new Error(`La herramienta "${herramienta.nombre}" ya está registrada.`);
    }
    this.herramientas.set(herramienta.nombre, herramienta);
  }

  disponiblesPara(rol: Rol): HerramientaRegistrada[] {
    return [...this.herramientas.values()].filter((h) => h.rolesPermitidos.includes(rol));
  }
}
