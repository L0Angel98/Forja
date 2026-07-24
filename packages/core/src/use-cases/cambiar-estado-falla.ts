import type { EstadoFalla, ReporteFalla } from "../entities/falla";
import { ReporteFallaNoEncontrado } from "../errors/reporte-falla-no-encontrado";
import { TransicionEstadoInvalida } from "../errors/transicion-estado-invalida";
import { transicionValida } from "../estado-falla";
import type { RepositorioFallas } from "../ports/repositorio-fallas";

export interface DependenciasCambiarEstadoFalla {
  fallas: RepositorioFallas;
}

export interface ParametrosCambiarEstadoFalla {
  id: string;
  siguiente: EstadoFalla;
}

export async function cambiarEstadoFalla(
  deps: DependenciasCambiarEstadoFalla,
  params: ParametrosCambiarEstadoFalla,
): Promise<ReporteFalla> {
  const reporte = await deps.fallas.buscarPorId(params.id);
  if (!reporte) throw new ReporteFallaNoEncontrado();

  if (!transicionValida(reporte.estado, params.siguiente)) {
    throw new TransicionEstadoInvalida(reporte.estado, params.siguiente);
  }

  await deps.fallas.actualizarEstado(params.id, params.siguiente);

  return { ...reporte, estado: params.siguiente };
}
