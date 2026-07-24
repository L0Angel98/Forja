import type { Herramienta, Rol } from "@forja/core";

/**
 * Registry (patrón Registry) de herramientas del agente, filtradas por rol.
 * El loop del agente las consume vía `disponiblesPara`/`buscar`.
 */
export class RegistroHerramientas {
  private readonly herramientas = new Map<string, Herramienta>();

  registrar(herramienta: Herramienta): void {
    if (this.herramientas.has(herramienta.nombre)) {
      throw new Error(`La herramienta "${herramienta.nombre}" ya está registrada.`);
    }
    this.herramientas.set(herramienta.nombre, herramienta);
  }

  disponiblesPara(rol: Rol): Herramienta[] {
    return [...this.herramientas.values()].filter((h) => h.rolesPermitidos.includes(rol));
  }

  buscarDisponiblePara(nombre: string, rol: Rol): Herramienta | undefined {
    const herramienta = this.herramientas.get(nombre);
    if (!herramienta || !herramienta.rolesPermitidos.includes(rol)) return undefined;
    return herramienta;
  }
}
