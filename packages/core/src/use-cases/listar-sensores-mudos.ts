import type { SensorMudo } from "../entities/sensor-mudo";
import type { RepositorioCatalogoSensores } from "../ports/repositorio-catalogo-sensores";
import type { RepositorioLecturas } from "../ports/repositorio-lecturas";

const MS_POR_MINUTO = 60 * 1000;

export interface DependenciasListarSensoresMudos {
  catalogo: RepositorioCatalogoSensores;
  lecturas: RepositorioLecturas;
}

export interface ParametrosListarSensoresMudos {
  ahora: Date;
  maquinaId?: string;
}

/** Un sensor está "mudo" si nunca tuvo lecturas, o si pasó más tiempo del configurado (mudoTrasMinutos) desde la última. */
export async function listarSensoresMudos(
  deps: DependenciasListarSensoresMudos,
  params: ParametrosListarSensoresMudos,
): Promise<readonly SensorMudo[]> {
  const sensores = params.maquinaId
    ? await deps.catalogo.listarPorMaquina(params.maquinaId)
    : await deps.catalogo.listar();

  const mudos: SensorMudo[] = [];

  for (const sensor of sensores) {
    const ultimaLectura = await deps.lecturas.ultimaLecturaEn(sensor.id);
    const minutosSinLectura = ultimaLectura
      ? (params.ahora.getTime() - ultimaLectura.getTime()) / MS_POR_MINUTO
      : null;

    const esMudo = minutosSinLectura === null || minutosSinLectura > sensor.mudoTrasMinutos;
    if (esMudo) {
      mudos.push({ sensorId: sensor.id, nombre: sensor.nombre, machineId: sensor.machineId, minutosSinLectura });
    }
  }

  return mudos;
}
