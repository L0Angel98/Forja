import type { CatalogoHerramientas, Herramienta, Rol } from "@forja/core";

/**
 * Registry (patrón Registry) de herramientas del agente, filtradas por rol.
 * El loop del agente las consume vía `disponiblesPara`/`buscar`. También
 * implementa el puerto CatalogoHerramientas (core) para que parsearRutina
 * pueda validar sin acoplarse a esta clase concreta.
 */
export class RegistroHerramientas implements CatalogoHerramientas {
  private readonly herramientas = new Map<string, Herramienta>();

  /** Construye un registry nuevo con exactamente estas herramientas (spec 16: registry acotado por rutina). */
  static desde(herramientas: readonly Herramienta[]): RegistroHerramientas {
    const registro = new RegistroHerramientas();
    for (const herramienta of herramientas) registro.registrar(herramienta);
    return registro;
  }

  registrar(herramienta: Herramienta): void {
    if (this.herramientas.has(herramienta.nombre)) {
      throw new Error(`La herramienta "${herramienta.nombre}" ya está registrada.`);
    }
    this.herramientas.set(herramienta.nombre, herramienta);
  }

  /** Idempotente: permite recargar herramientas de conectores (spec 17) sin reiniciar el proceso. */
  desregistrar(nombre: string): void {
    this.herramientas.delete(nombre);
  }

  disponiblesPara(rol: Rol): Herramienta[] {
    return [...this.herramientas.values()].filter((h) => h.rolesPermitidos.includes(rol));
  }

  buscarDisponiblePara(nombre: string, rol: Rol): Herramienta | undefined {
    const herramienta = this.herramientas.get(nombre);
    if (!herramienta || !herramienta.rolesPermitidos.includes(rol)) return undefined;
    return herramienta;
  }

  existe(nombre: string): boolean {
    return this.herramientas.has(nombre);
  }

  esSoloLectura(nombre: string): boolean {
    return this.herramientas.get(nombre)?.soloLectura ?? false;
  }

  /** Por construcción nunca devuelve una herramienta que pueda escribir/mutar (spec 16). */
  disponiblesParaRutina(nombres: readonly string[]): Herramienta[] {
    return nombres
      .map((nombre) => this.herramientas.get(nombre))
      .filter((herramienta): herramienta is Herramienta => herramienta !== undefined && herramienta.soloLectura);
  }
}
