import type { Bucket, SerieAgregada, TipoAgregacion } from "../entities/agregacion-sensor";
import { RANGO_MAXIMO_DIAS } from "../entities/agregacion-sensor";
import type { Usuario } from "../entities/usuario";
import { MaquinaFueraDeArea } from "../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../errors/maquina-no-encontrada";
import { RangoConsultaDemasiadoAmplio } from "../errors/rango-consulta-demasiado-amplio";
import { SensorNoEncontrado } from "../errors/sensor-no-encontrado";
import type { RepositorioAgregacionesSensores } from "../ports/repositorio-agregaciones-sensores";
import type { RepositorioAreasUsuario } from "../ports/repositorio-areas-usuario";
import type { RepositorioCatalogoSensores } from "../ports/repositorio-catalogo-sensores";
import type { RepositorioMaquinas } from "../ports/repositorio-maquinas";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface DependenciasConsultarSensores {
  maquinas: RepositorioMaquinas;
  areasUsuario: RepositorioAreasUsuario;
  catalogo: RepositorioCatalogoSensores;
  agregaciones: RepositorioAgregacionesSensores;
}

export interface ParametrosConsultarSensores {
  usuario: Usuario;
  maquinaId: string;
  sensorId?: string;
  agregacion: TipoAgregacion;
  bucket: Bucket;
  desde: Date;
  hasta: Date;
}

/**
 * Único camino para consultar series de sensores en lenguaje natural: el
 * LLM nunca genera SQL, solo elige agregación/bucket/rango de un conjunto
 * cerrado que esta función valida y traduce a RepositorioAgregacionesSensores.
 * Sin sensorId, consulta todos los sensores de la máquina.
 */
export async function consultarSensores(
  deps: DependenciasConsultarSensores,
  params: ParametrosConsultarSensores,
): Promise<readonly SerieAgregada[]> {
  const maquina = await deps.maquinas.buscarPorId(params.maquinaId);
  if (!maquina) throw new MaquinaNoEncontrada();

  if (params.usuario.rol === "operador") {
    const areas = await deps.areasUsuario.areasDe(params.usuario.id);
    if (!areas.includes(maquina.areaId)) throw new MaquinaFueraDeArea();
  }

  if (params.hasta.getTime() - params.desde.getTime() > RANGO_MAXIMO_DIAS * MS_POR_DIA) {
    throw new RangoConsultaDemasiadoAmplio();
  }

  const sensores = params.sensorId
    ? [await resolverSensorDeLaMaquina(deps, params.sensorId, maquina.id)]
    : await deps.catalogo.listarPorMaquina(maquina.id);

  const series = await Promise.all(
    sensores.map((sensor) =>
      deps.agregaciones.consultar({
        sensorId: sensor.id,
        agregacion: params.agregacion,
        bucket: params.bucket,
        desde: params.desde,
        hasta: params.hasta,
      }),
    ),
  );

  return series;
}

async function resolverSensorDeLaMaquina(deps: DependenciasConsultarSensores, sensorId: string, machineId: string) {
  const sensor = await deps.catalogo.buscarPorId(sensorId);
  if (!sensor || sensor.machineId !== machineId) throw new SensorNoEncontrado();
  return sensor;
}
