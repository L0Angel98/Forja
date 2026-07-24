export const EVENTO_FALLA_REPORTADA = "falla_reportada";

export interface FallaReportada {
  readonly failureReportId: string;
  readonly machineId: string;
  readonly areaId: string;
  readonly ocurridoEn: Date;
}
