import type { Usuario } from "../entities/usuario";
import { SesionInvalida } from "../errors/sesion-invalida";
import type { RepositorioSesiones } from "../ports/repositorio-sesiones";
import type { RepositorioUsuarios } from "../ports/repositorio-usuarios";
import {
  INACTIVIDAD_MAXIMA_DISPOSITIVO_COMPARTIDO_MS,
  INACTIVIDAD_MAXIMA_MS,
} from "../config/sesion";

export interface DependenciasObtenerSesionActual {
  sesiones: RepositorioSesiones;
  usuarios: RepositorioUsuarios;
}

export interface ParametrosObtenerSesionActual {
  sesionId: string;
  ahora: Date;
}

export interface ResultadoObtenerSesionActual {
  usuario: Usuario;
}

export async function obtenerSesionActual(
  deps: DependenciasObtenerSesionActual,
  params: ParametrosObtenerSesionActual,
): Promise<ResultadoObtenerSesionActual> {
  const { sesiones, usuarios } = deps;
  const { sesionId, ahora } = params;

  const sesion = await sesiones.buscarPorId(sesionId);
  if (!sesion) throw new SesionInvalida();

  const limiteInactividad = sesion.dispositivoCompartido
    ? INACTIVIDAD_MAXIMA_DISPOSITIVO_COMPARTIDO_MS
    : INACTIVIDAD_MAXIMA_MS;
  const inactivaDesdeMs = ahora.getTime() - sesion.ultimaActividadEn.getTime();

  if (inactivaDesdeMs > limiteInactividad) {
    await sesiones.eliminar(sesionId);
    throw new SesionInvalida();
  }

  const usuario = await usuarios.buscarPorId(sesion.usuarioId);
  if (!usuario || !usuario.activo) {
    await sesiones.eliminar(sesionId);
    throw new SesionInvalida();
  }

  await sesiones.actualizarUltimaActividad(sesionId, ahora);

  return { usuario };
}
