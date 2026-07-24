import type { OrigenReporte, ReporteFalla, Severidad, SintomaTaxonomia } from "../entities/falla";
import { EVENTO_FALLA_REPORTADA, type FallaReportada } from "../events/falla-reportada";
import type { BusEventos } from "../events/bus-eventos";
import type { RepositorioAreasUsuario } from "../ports/repositorio-areas-usuario";
import type { RepositorioFallas } from "../ports/repositorio-fallas";
import type { RepositorioMaquinas } from "../ports/repositorio-maquinas";
import type { Usuario } from "../entities/usuario";
import { prepararBorradorReporteFalla } from "./preparar-borrador-reporte-falla";

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
  const borrador = await prepararBorradorReporteFalla(deps, params);

  const reporte: ReporteFalla = {
    id: deps.generarId(),
    machineId: borrador.machineId,
    reportadoPor: params.usuario.id,
    sintomaTaxonomia: borrador.sintomaTaxonomia,
    sintomaOtro: borrador.sintomaOtro,
    descripcion: borrador.descripcion,
    severidad: borrador.severidad,
    fotos: borrador.fotos,
    origen: params.origen,
    estado: "abierto",
    creadoEn: params.ahora,
  };

  await deps.fallas.crear(reporte);

  const evento: FallaReportada = {
    failureReportId: reporte.id,
    machineId: borrador.machineId,
    areaId: borrador.areaId,
    ocurridoEn: params.ahora,
  };
  await deps.bus.publicar(EVENTO_FALLA_REPORTADA, evento);

  return reporte;
}
