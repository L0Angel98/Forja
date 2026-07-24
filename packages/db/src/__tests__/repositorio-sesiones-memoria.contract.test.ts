import type { RepositorioSesiones, Sesion } from "@forja/core";
import { pruebasDeContratoRepositorioSesiones } from "./contracts/repositorio-sesiones.contract";

function crearRepositorioSesionesMemoria(): RepositorioSesiones {
  const sesiones = new Map<string, Sesion>();
  return {
    async crear(sesion) {
      sesiones.set(sesion.id, sesion);
    },
    async buscarPorId(id) {
      return sesiones.get(id) ?? null;
    },
    async actualizarUltimaActividad(id, fecha) {
      const sesion = sesiones.get(id);
      if (sesion) sesiones.set(id, { ...sesion, ultimaActividadEn: fecha });
    },
    async eliminar(id) {
      sesiones.delete(id);
    },
  };
}

pruebasDeContratoRepositorioSesiones(
  "memoria",
  () => crearRepositorioSesionesMemoria(),
  () => "usuario-cualquiera",
);
