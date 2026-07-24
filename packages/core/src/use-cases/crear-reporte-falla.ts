import type { OrigenReporte, ReporteFalla, Severidad, SintomaTaxonomia } from "../entities/falla";
import { DemasiadasFotos, MAXIMO_FOTOS } from "../errors/demasiadas-fotos";
import { MaquinaFueraDeArea } from "../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../errors/maquina-no-encontrada";
import { SintomaRequerido } from "../errors/sintoma-requerido";
import { EVENTO_FALLA_REPORTADA, type FallaReportada } from "../events/falla-reportada";
import type { BusEventos } from "../events/bus-eventos";
import type { RepositorioAreasUsuario } from "../ports/repositorio-areas-usuario";
import type { RepositorioFallas } from "../ports/repositorio-fallas";
import type { RepositorioMaquinas } from "../ports/repositorio-maquinas";
import type { Usuario } from "../entities/usuario";

export interface DependenciasCrearReporteFalla {
  maquinas: RepositorioMaquinas;
  areasUsuario: RepositorioAreasUsuario;
  fallas: RepositorioFallas;
  bus: BusEventos;
  generarId: () => string;
}

export interface ParametrosCrearReporteFalla {
  usuario: Usuario;
  machineId: string;
  sintomaTaxonomia?: SintomaTaxonomia;
  sintomaOtro?: string;
  descripcion: string;
  severidad: Severidad;
  fotos: readonly string[];
  origen: OrigenReporte;
  ahora: Date;
}

export async function crearReporteFalla(
  deps: DependenciasCrearReporteFalla,
  params: ParametrosCrearReporteFalla,
): Promise<ReporteFalla> {
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

  const reporte: ReporteFalla = {
    id: deps.generarId(),
    machineId: maquina.id,
    reportadoPor: params.usuario.id,
    sintomaTaxonomia: params.sintomaTaxonomia ?? null,
    sintomaOtro: params.sintomaOtro ?? null,
    descripcion: params.descripcion,
    severidad: params.severidad,
    fotos: params.fotos,
    origen: params.origen,
    estado: "abierto",
    creadoEn: params.ahora,
  };

  await deps.fallas.crear(reporte);

  const evento: FallaReportada = {
    failureReportId: reporte.id,
    machineId: maquina.id,
    areaId: maquina.areaId,
    ocurridoEn: params.ahora,
  };
  await deps.bus.publicar(EVENTO_FALLA_REPORTADA, evento);

  return reporte;
}
