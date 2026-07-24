import { randomUUID } from "node:crypto";
import {
  BusEventos,
  crearAlmacenArchivosFalso,
  crearEscritorArchivosWorkspaceFalso,
  crearEscritorMemoriaFalso,
  crearExtractorTextoFalso,
  crearGeneradorEmbeddingsFalso,
  crearCanalSalidaEnviadorFalso,
  crearEscritorArchivosRutinasFalso,
  crearHasherContrasenasFalso,
  crearColaTrabajosFalso,
  crearProveedorLLMFalso,
  crearRegistradorAuditoriaMemoria,
  crearRegistradorTraceFalso,
  crearRepositorioAgregacionesSensoresFalso,
  crearRepositorioAreasUsuarioFalso,
  crearRepositorioCatalogoSensoresFalso,
  crearRepositorioChunksFalso,
  crearRepositorioCuarentenaFalso,
  crearRepositorioDocumentosFalso,
  crearRepositorioEjecucionesRutinaFalso,
  crearRepositorioEstadoIngestaFalso,
  crearRepositorioFallasFalso,
  crearRepositorioFeedbackFalso,
  crearRepositorioIntentosLoginMemoria,
  crearRepositorioLecturasFalso,
  crearRepositorioLecturasVentanaFalso,
  crearRepositorioMaquinasFalso,
  crearRepositorioNotificacionesFalso,
  crearRepositorioSesionesMemoria,
  crearRepositorioSnapshotsFallaFalso,
  crearRepositorioSensoresPorMaquinaFalso,
  crearRepositorioSugerenciasMemoriaFalso,
  crearRepositorioUsuariosMemoria,
  type ConectorActivo,
  type ConfiguracionWorkspace,
  type EstrategiaChunking,
  type SelectorEstrategiaChunking,
  type Usuario,
} from "@forja/core";
import type { EstadoConectorInfo } from "@forja/connectors";
import { ProgramadorRutinas, RegistroCanalesSalida, RegistroHerramientas, type IWorkspaceLoader } from "@forja/runtime";
import {
  crearHerramientaBuscarDocumentos,
  crearHerramientaConsultarEstadoSensores,
  crearHerramientaConsultarSensores,
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

function crearConectoresRuntimeFalso(): ComposicionRuntime["conectores"] & {
  activos: Map<string, ConectorActivo>;
  estados: EstadoConectorInfo[];
} {
  const activos = new Map<string, ConectorActivo>();
  const estados: EstadoConectorInfo[] = [];
  return {
    activos,
    estados,
    obtenerEstados: () => estados,
    obtener: (nombreConector) => activos.get(nombreConector),
  };
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
  catalogoSensoresRepo: ReturnType<typeof crearRepositorioCatalogoSensoresFalso>;
  lecturasRepo: ReturnType<typeof crearRepositorioLecturasFalso>;
  cuarentenaRepo: ReturnType<typeof crearRepositorioCuarentenaFalso>;
  agregacionesSensoresRepo: ReturnType<typeof crearRepositorioAgregacionesSensoresFalso>;
  estadoIngestaRepo: ReturnType<typeof crearRepositorioEstadoIngestaFalso>;
  almacenFalso: ReturnType<typeof crearAlmacenArchivosFalso>;
  ejecucionesRutinaRepo: ReturnType<typeof crearRepositorioEjecucionesRutinaFalso>;
  escritorRutinasFalso: ReturnType<typeof crearEscritorArchivosRutinasFalso>;
  conectoresFalso: ReturnType<typeof crearConectoresRuntimeFalso>;
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
  const catalogoSensoresRepo = crearRepositorioCatalogoSensoresFalso();
  const lecturasRepo = crearRepositorioLecturasFalso();
  const cuarentenaRepo = crearRepositorioCuarentenaFalso();
  const agregacionesSensoresRepo = crearRepositorioAgregacionesSensoresFalso();
  const estadoIngestaRepo = crearRepositorioEstadoIngestaFalso();
  const almacenFalso = crearAlmacenArchivosFalso();
  const colaFalsa = crearColaTrabajosFalso();
  const bus = new BusEventos();
  const embeddings = crearGeneradorEmbeddingsFalso();
  const ejecucionesRutinaRepo = crearRepositorioEjecucionesRutinaFalso();
  const escritorRutinasFalso = crearEscritorArchivosRutinasFalso();
  const conectoresFalso = crearConectoresRuntimeFalso();
  const canalesSalida = new RegistroCanalesSalida();
  canalesSalida.registrar("ui", crearCanalSalidaEnviadorFalso());
  const programadorRutinas = new ProgramadorRutinas({
    cargarRutinas: async () => ({ rutinas: [], errores: [] }),
    ejecutar: async () => {
      // no-op en pruebas
    },
  });

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
  registroHerramientas.registrar(
    crearHerramientaConsultarSensores({
      maquinas: maquinasRepo,
      areasUsuario: areasUsuarioRepo,
      catalogo: catalogoSensoresRepo,
      agregaciones: agregacionesSensoresRepo,
    }),
  );
  registroHerramientas.registrar(
    crearHerramientaConsultarEstadoSensores({
      maquinas: maquinasRepo,
      areasUsuario: areasUsuarioRepo,
      catalogo: catalogoSensoresRepo,
      lecturas: lecturasRepo,
    }),
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
    catalogoSensores: catalogoSensoresRepo,
    lecturas: lecturasRepo,
    cuarentena: cuarentenaRepo,
    agregacionesSensores: agregacionesSensoresRepo,
    estadoIngesta: estadoIngestaRepo,
    almacen: almacenFalso,
    conectores: conectoresFalso,
    cerrarConectores: async () => {},
    extractor: crearExtractorTextoFalso(),
    selectorEstrategia: crearSelectorEstrategiaFalso(),
    embeddings,
    cola: colaFalsa,
    bus,
    horasVentanaSnapshot: 4,
    generarId: randomUUID,
    ejecucionesRutina: ejecucionesRutinaRepo,
    escritorRutinas: escritorRutinasFalso,
    canalesSalida,
    programadorRutinas,
    presupuestoMaximoPorEjecucion: 100_000,
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
    catalogoSensoresRepo,
    lecturasRepo,
    cuarentenaRepo,
    agregacionesSensoresRepo,
    estadoIngestaRepo,
    almacenFalso,
    ejecucionesRutinaRepo,
    escritorRutinasFalso,
    conectoresFalso,
  };
}
