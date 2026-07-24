import type { SnapshotSensor } from "../entities/snapshot-sensor";
import type { RepositorioLecturasVentana } from "../ports/repositorio-lecturas-ventana";
import type { RepositorioSensoresPorMaquina } from "../ports/repositorio-sensores-por-maquina";
import type { RepositorioSnapshotsFalla } from "../ports/repositorio-snapshots-falla";

export interface DependenciasMaterializarSnapshotFalla {
  sensores: RepositorioSensoresPorMaquina;
  lecturas: RepositorioLecturasVentana;
  snapshots: RepositorioSnapshotsFalla;
  generarId: () => string;
  /** Tamaño de la ventana de lectura previa a la falla, en horas. */
  horasVentana: number;
}

export interface ParametrosMaterializarSnapshotFalla {
  failureReportId: string;
  machineId: string;
  ocurridoEn: Date;
}

export async function materializarSnapshotFalla(
  deps: DependenciasMaterializarSnapshotFalla,
  params: ParametrosMaterializarSnapshotFalla,
): Promise<SnapshotSensor[]> {
  const ventanaFin = params.ocurridoEn;
  const ventanaInicio = new Date(ventanaFin.getTime() - deps.horasVentana * 60 * 60 * 1000);

  const sensores = await deps.sensores.listarPorMaquina(params.machineId);
  const snapshots: SnapshotSensor[] = [];

  for (const sensor of sensores) {
    const lecturas = await deps.lecturas.leerVentana(sensor.id, ventanaInicio, ventanaFin);
    const valores = lecturas.map((l) => l.value);

    const snapshot: SnapshotSensor = {
      id: deps.generarId(),
      failureReportId: params.failureReportId,
      sensorId: sensor.id,
      ventanaInicio,
      ventanaFin,
      min: valores.length > 0 ? Math.min(...valores) : null,
      max: valores.length > 0 ? Math.max(...valores) : null,
      avg: valores.length > 0 ? valores.reduce((suma, v) => suma + v, 0) / valores.length : null,
      last: lecturas.at(-1)?.value ?? null,
    };

    await deps.snapshots.crear(snapshot);
    snapshots.push(snapshot);
  }

  return snapshots;
}
