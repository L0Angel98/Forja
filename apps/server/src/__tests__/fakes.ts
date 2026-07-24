import {
  crearHasherContrasenasFalso,
  crearRegistradorAuditoriaMemoria,
  crearRepositorioIntentosLoginMemoria,
  crearRepositorioSesionesMemoria,
  crearRepositorioUsuariosMemoria,
  type Usuario,
} from "@forja/core";
import type { ComposicionAuth } from "../auth/composicion";

let contadorSesiones = 0;

export function crearComposicionAuthFalsa(usuarios: Usuario[] = []): ComposicionAuth & {
  usuariosRepo: ReturnType<typeof crearRepositorioUsuariosMemoria>;
  sesionesRepo: ReturnType<typeof crearRepositorioSesionesMemoria>;
  auditoriaRepo: ReturnType<typeof crearRegistradorAuditoriaMemoria>;
} {
  const usuariosRepo = crearRepositorioUsuariosMemoria(usuarios);
  const sesionesRepo = crearRepositorioSesionesMemoria();
  const auditoriaRepo = crearRegistradorAuditoriaMemoria();

  return {
    usuarios: usuariosRepo,
    sesiones: sesionesRepo,
    hasher: crearHasherContrasenasFalso(),
    intentosLogin: crearRepositorioIntentosLoginMemoria(),
    auditoria: auditoriaRepo,
    generarIdSesion: () => `sesion-falsa-${(contadorSesiones += 1)}`,
    usuariosRepo,
    sesionesRepo,
    auditoriaRepo,
  };
}
