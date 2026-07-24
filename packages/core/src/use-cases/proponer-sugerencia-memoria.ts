import type { SugerenciaMemoria } from "../entities/sugerencia-memoria";
import type { RepositorioSugerenciasMemoria } from "../ports/repositorio-sugerencias-memoria";

export interface DependenciasProponerSugerenciaMemoria {
  sugerencias: RepositorioSugerenciasMemoria;
  generarId: () => string;
}

export interface ParametrosProponerSugerenciaMemoria {
  contenido: string;
  ahora: Date;
}

export async function proponerSugerenciaMemoria(
  deps: DependenciasProponerSugerenciaMemoria,
  params: ParametrosProponerSugerenciaMemoria,
): Promise<SugerenciaMemoria> {
  const sugerencia: SugerenciaMemoria = {
    id: deps.generarId(),
    contenido: params.contenido,
    estado: "pendiente",
    propuestaEn: params.ahora,
  };
  await deps.sugerencias.crear(sugerencia);
  return sugerencia;
}
