import { randomUUID } from "node:crypto";
import {
  BusEventos,
  crearAlmacenArchivosFalso,
  crearEscritorArchivosWorkspaceFalso,
  crearEscritorMemoriaFalso,
  crearExtractorTextoFalso,
  crearGeneradorEmbeddingsFalso,
  crearHasherContrasenasFalso,
  crearColaTrabajosFalso,
  crearProveedorLLMFalso,
  crearRegistradorAuditoriaMemoria,
  crearRegistradorTraceFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioChunksFalso,
  crearRepositorioDocumentosFalso,
  crearRepositorioFallasFalso,
  crearRepositorioFeedbackFalso,
  crearRepositorioIntentosLoginMemoria,
  crearRepositorioLecturasVentanaFalso,
  crearRepositorioMaquinasFalso,
  crearRepositorioNotificacionesFalso,
  crearRepositorioSesionesMemoria,
  crearRepositorioSnapshotsFallaFalso,
  crearRepositorioSensoresPorMaquinaFalso,
  crearRepositorioSugerenciasMemoriaFalso,
  crearRepositorioUsuariosMemoria,
  type ConfiguracionWorkspace,
  type EstrategiaChunking,
  type SelectorEstrategiaChunking,
  type Usuario,
} from "@forja/core";
import { RegistroHerramientas, type IWorkspaceLoader } from "@forja/runtime";
import {
  crearHerramientaBuscarDocumentos,
  crearHerramientaCrearReporteFalla,
  crearHerramientaProponerMemoria,
} from "@forja/tools";
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

const ESTRATEGIA_FALSA: EstrategiaChunking = {
  nombre: "falsa",
  trocear: (textoExtraido) =>
    textoExtraido.texto.trim() ? [{ contenido: textoExtraido.texto.trim(), seccion: null, pagina: null }] : [],
};

function crearSelectorEstrategiaFalso(): SelectorEstrategiaChunking {
  return { seleccionar: () => ESTRATEGIA_FALSA };
}

export function crearComposicionRuntimeFalsa(): ComposicionRuntime & {
  sugerenciasMemoriaRepo: ReturnType<typeof crearRepositorioSugerenciasMemoriaFalso>;
  escritorMemoriaFalso: ReturnType<typeof crearEscritorMemoriaFalso>;
  escritorWorkspaceFalso: ReturnType<typeof crearEscritorArchivosWorkspaceFalso>;
  maquinasRepo: ReturnType<typeof crearRepositorioMaquinasFalso>;
  areasUsuarioRepo: ReturnType<typeof crearRepositorioAreasUsuarioFalso>;
  fallasRepo: ReturnType<typeof crearRepositorioFallasFalso>;
  colaFalsa: ReturnType<typeof crearColaTrabajosFalso>;
  notificacionesRepo: ReturnType<typeof crearRepositorioNotificacionesFalso>;
  documentosRepo: ReturnType<typeof crearRepositorioDocumentosFalso>;
  chunksRepo: ReturnType<typeof crearRepositorioChunksFalso>;
  feedbackRepo: ReturnType<typeof crearRepositorioFeedbackFalso>;
  almacenFalso: ReturnType<typeof crearAlmacenArchivosFalso>;
} {
  const sugerenciasMemoriaRepo = crearRepositorioSugerenciasMemoriaFalso();
  const escritorMemoriaFalso = crearEscritorMemoriaFalso();
  const escritorWorkspaceFalso = crearEscritorArchivosWorkspaceFalso();
  const maquinasRepo = crearRepositorioMaquinasFalso();
  const areasUsuarioRepo = crearRepositorioAreasUsuarioFalso();
  const fallasRepo = crearRepositorioFallasFalso(maquinasRepo.maquinas);
  const sensoresPorMaquina = crearRepositorioSensoresPorMaquinaFalso();
  const lecturasVentana = crearRepositorioLecturasVentanaFalso();
  const snapshotsFalla = crearRepositorioSnapshotsFallaFalso();
  const notificacionesRepo = crearRepositorioNotificacionesFalso();
  const documentosRepo = crearRepositorioDocumentosFalso();
  const chunksRepo = crearRepositorioChunksFalso(documentosRepo.documentos);
  const feedbackRepo = crearRepositorioFeedbackFalso();
  const almacenFalso = crearAlmacenArchivosFalso();
  const colaFalsa = crearColaTrabajosFalso();
  const bus = new BusEventos();
  const embeddings = crearGeneradorEmbeddingsFalso();

  const registroHerramientas = new RegistroHerramientas();
  registroHerramientas.registrar(
    crearHerramientaProponerMemoria({ sugerencias: sugerenciasMemoriaRepo, generarId: () => "id-falso" }),
  );
  registroHerramientas.registrar(
    crearHerramientaCrearReporteFalla({ maquinas: maquinasRepo, areasUsuario: areasUsuarioRepo }),
  );
  registroHerramientas.registrar(
    crearHerramientaBuscarDocumentos({ embeddings, chunks: chunksRepo, areasUsuario: areasUsuarioRepo }),
  );

  return {
    plantId: "planta-falsa",
    workspaceLoader: crearWorkspaceLoaderFalso({
      soul: "Eres Forja.",
      planta: "Planta de prueba.",
      memoria: "",
      advertencias: [],
      archivosInvalidos: [],
    }),
    registroHerramientas,
    trace: crearRegistradorTraceFalso(),
    sugerenciasMemoria: sugerenciasMemoriaRepo,
    escritorMemoria: escritorMemoriaFalso,
    escritorWorkspace: escritorWorkspaceFalso,
    llm: crearProveedorLLMFalso([]),
    maquinas: maquinasRepo,
    areasUsuario: areasUsuarioRepo,
    fallas: fallasRepo,
    sensoresPorMaquina,
    lecturasVentana,
    snapshotsFalla,
    notificaciones: notificacionesRepo,
    documentos: documentosRepo,
    chunks: chunksRepo,
    feedback: feedbackRepo,
    almacen: almacenFalso,
    extractor: crearExtractorTextoFalso(),
    selectorEstrategia: crearSelectorEstrategiaFalso(),
    embeddings,
    cola: colaFalsa,
    bus,
    horasVentanaSnapshot: 4,
    generarId: randomUUID,
    sugerenciasMemoriaRepo,
    escritorMemoriaFalso,
    escritorWorkspaceFalso,
    maquinasRepo,
    areasUsuarioRepo,
    fallasRepo,
    colaFalsa,
    notificacionesRepo,
    documentosRepo,
    chunksRepo,
    feedbackRepo,
    almacenFalso,
  };
}
