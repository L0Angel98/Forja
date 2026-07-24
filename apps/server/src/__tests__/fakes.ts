import {
  crearEscritorArchivosWorkspaceFalso,
  crearEscritorMemoriaFalso,
  crearHasherContrasenasFalso,
  crearRegistradorAuditoriaMemoria,
  crearRegistradorTraceFalso,
  crearRepositorioIntentosLoginMemoria,
  crearRepositorioSesionesMemoria,
  crearRepositorioSugerenciasMemoriaFalso,
  crearRepositorioUsuariosMemoria,
  type ConfiguracionWorkspace,
  type Usuario,
} from "@forja/core";
import { RegistroHerramientas, type IWorkspaceLoader } from "@forja/runtime";
import type { ComposicionAuth } from "../auth/composicion";
import type { ComposicionRuntime } from "../runtime/composicion";

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

function crearWorkspaceLoaderFalso(configInicial: ConfiguracionWorkspace): IWorkspaceLoader & {
  config: ConfiguracionWorkspace;
} {
  const estado = { config: configInicial };
  return {
    get config() {
      return estado.config;
    },
    obtenerConfiguracion: () => estado.config,
    async recargar() {
      return estado.config;
    },
    detener() {
      // no-op
    },
  };
}

export function crearComposicionRuntimeFalsa(): ComposicionRuntime & {
  sugerenciasMemoriaRepo: ReturnType<typeof crearRepositorioSugerenciasMemoriaFalso>;
  escritorMemoriaFalso: ReturnType<typeof crearEscritorMemoriaFalso>;
  escritorWorkspaceFalso: ReturnType<typeof crearEscritorArchivosWorkspaceFalso>;
} {
  const sugerenciasMemoriaRepo = crearRepositorioSugerenciasMemoriaFalso();
  const escritorMemoriaFalso = crearEscritorMemoriaFalso();
  const escritorWorkspaceFalso = crearEscritorArchivosWorkspaceFalso();

  return {
    workspaceLoader: crearWorkspaceLoaderFalso({
      soul: "Eres Forja.",
      planta: "Planta de prueba.",
      memoria: "",
      advertencias: [],
      archivosInvalidos: [],
    }),
    registroHerramientas: new RegistroHerramientas(),
    trace: crearRegistradorTraceFalso(),
    sugerenciasMemoria: sugerenciasMemoriaRepo,
    escritorMemoria: escritorMemoriaFalso,
    escritorWorkspace: escritorWorkspaceFalso,
    generarId: () => `id-falso-${(contadorSesiones += 1)}`,
    sugerenciasMemoriaRepo,
    escritorMemoriaFalso,
    escritorWorkspaceFalso,
  };
}
