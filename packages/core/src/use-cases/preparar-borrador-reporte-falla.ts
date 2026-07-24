import type { Severidad, SintomaTaxonomia } from "../entities/falla";
import type { Usuario } from "../entities/usuario";
import { DemasiadasFotos, MAXIMO_FOTOS } from "../errors/demasiadas-fotos";
import { MaquinaFueraDeArea } from "../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../errors/maquina-no-encontrada";
import { SintomaRequerido } from "../errors/sintoma-requerido";
import type { RepositorioAreasUsuario } from "../ports/repositorio-areas-usuario";
import type { RepositorioMaquinas } from "../ports/repositorio-maquinas";

/**
 * Un borrador validado, sin persistir: describe qué se reportaría, pero no
 * es un reporte real hasta que el usuario lo confirme (POST /api/fallas).
 * La herramienta del agente solo produce este borrador; nunca persiste.
 */
export interface BorradorReporteFalla {
  readonly machineId: string;
  readonly areaId: string;
  readonly sintomaTaxonomia: SintomaTaxonomia | null;
  readonly sintomaOtro: string | null;
  readonly descripcion: string;
  readonly severidad: Severidad;
  readonly fotos: readonly string[];
}

export interface DependenciasPrepararBorradorReporteFalla {
  maquinas: RepositorioMaquinas;
  areasUsuario: RepositorioAreasUsuario;
}

export interface ParametrosPrepararBorradorReporteFalla {
  usuario: Usuario;
  machineId: string;
  sintomaTaxonomia?: SintomaTaxonomia;
  sintomaOtro?: string;
  descripcion: string;
  severidad: Severidad;
  fotos: readonly string[];
}

export async function prepararBorradorReporteFalla(
  deps: DependenciasPrepararBorradorReporteFalla,
  params: ParametrosPrepararBorradorReporteFalla,
): Promise<BorradorReporteFalla> {
  if (!params.sintomaTaxonomia && !params.sintomaOtro) {
    throw new SintomaRequerido();
  }
  if (params.fotos.length > MAXIMO_FOTOS) {
    throw new DemasiadasFotos();
  }

  const maquina = await deps.maquinas.buscarPorId(params.machineId);
  if (!maquina) throw new MaquinaNoEncontrada();

  if (params.usuario.rol === "operador") {
    const areas = await deps.areasUsuario.areasDe(params.usuario.id);
    if (!areas.includes(maquina.areaId)) throw new MaquinaFueraDeArea();
  }

  return {
    machineId: maquina.id,
    areaId: maquina.areaId,
    sintomaTaxonomia: params.sintomaTaxonomia ?? null,
    sintomaOtro: params.sintomaOtro ?? null,
    descripcion: params.descripcion,
    severidad: params.severidad,
    fotos: params.fotos,
  };
}
