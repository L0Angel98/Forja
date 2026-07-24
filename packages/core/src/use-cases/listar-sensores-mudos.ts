import type { SensorMudo } from "../entities/sensor-mudo";
import type { Usuario } from "../entities/usuario";
import { MaquinaFueraDeArea } from "../errors/maquina-fuera-de-area";
import { MaquinaNoEncontrada } from "../errors/maquina-no-encontrada";
import type { RepositorioAreasUsuario } from "../ports/repositorio-areas-usuario";
import type { RepositorioCatalogoSensores } from "../ports/repositorio-catalogo-sensores";
import type { RepositorioLecturas } from "../ports/repositorio-lecturas";
import type { RepositorioMaquinas } from "../ports/repositorio-maquinas";

const MS_POR_MINUTO = 60 * 1000;

export interface DependenciasListarSensoresMudos {
  catalogo: RepositorioCatalogoSensores;
  lecturas: RepositorioLecturas;
  maquinas: RepositorioMaquinas;
  areasUsuario: RepositorioAreasUsuario;
}

export interface ParametrosListarSensoresMudos {
  usuario: Usuario;
  ahora: Date;
  maquinaId?: string;
}

/**
 * Un sensor está "mudo" si nunca tuvo lecturas, o si pasó más tiempo del
 * configurado (mudoTrasMinutos) desde la última. Mismo control de acceso por
 * área que consultarSensores (spec 13/14): un operador solo ve máquinas de
 * sus áreas asignadas, con o sin maquinaId explícito.
 */
export async function listarSensoresMudos(
  deps: DependenciasListarSensoresMudos,
  params: ParametrosListarSensoresMudos,
): Promise<readonly SensorMudo[]> {
  let machineIdsPermitidas: Set<string> | null = null;

  if (params.maquinaId) {
    const maquina = await deps.maquinas.buscarPorId(params.maquinaId);
    if (!maquina) throw new MaquinaNoEncontrada();
    if (params.usuario.rol === "operador") {
      const areas = await deps.areasUsuario.areasDe(params.usuario.id);
      if (!areas.includes(maquina.areaId)) throw new MaquinaFueraDeArea();
    }
  } else if (params.usuario.rol === "operador") {
    const areas = await deps.areasUsuario.areasDe(params.usuario.id);
    const maquinasPermitidas = (await Promise.all(areas.map((areaId) => deps.maquinas.listarPorArea(areaId)))).flat();
    machineIdsPermitidas = new Set(maquinasPermitidas.map((m) => m.id));
  }

  const sensores = params.maquinaId
    ? await deps.catalogo.listarPorMaquina(params.maquinaId)
    : await deps.catalogo.listar();

  const sensoresVisibles = machineIdsPermitidas
    ? sensores.filter((sensor) => machineIdsPermitidas!.has(sensor.machineId))
    : sensores;

  const mudos: SensorMudo[] = [];

  for (const sensor of sensoresVisibles) {
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
