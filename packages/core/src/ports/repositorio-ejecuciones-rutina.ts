import type { EjecucionRutina } from "../entities/ejecucion-rutina";

export interface RepositorioEjecucionesRutina {
  crear(ejecucion: EjecucionRutina): Promise<void>;
  listarPorRutina(rutinaNombre: string, limite: number): Promise<EjecucionRutina[]>;
  /** Non-overlap (spec 16): true si hay una ejecución de esta rutina sin finalizadaEn. */
  hayEnCurso(rutinaNombre: string): Promise<boolean>;
  /** Para el presupuesto mensual global por planta: suma de tokensUsados desde `desde`. */
  tokensUsadosDesde(plantId: string, desde: Date): Promise<number>;
}
