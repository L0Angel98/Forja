import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AlmacenArchivos,
  BusEventos as TipoBusEventos,
  ColaTrabajos,
  ConectorActivo,
  ConectorConfigurado,
  EscritorMemoria,
  EscritorArchivosRutinas,
  EscritorArchivosWorkspace,
  ExtractorTexto,
  GeneradorEmbeddings,
  ProveedorLLM,
  RegistradorTrace,
  RepositorioAgregacionesSensores,
  RepositorioAreasUsuario,
  RepositorioCatalogoSensores,
  RepositorioChunks,
  RepositorioCuarentena,
  RepositorioDocumentos,
  RepositorioEjecucionesRutina,
  RepositorioEstadoIngesta,
  RepositorioFallas,
  RepositorioFeedback,
  RepositorioLecturas,
  RepositorioLecturasVentana,
  RepositorioMaquinas,
  RepositorioNotificaciones,
  RepositorioSensoresPorMaquina,
  RepositorioSnapshotsFalla,
  RepositorioSugerenciasMemoria,
  SelectorEstrategiaChunking,
} from "@forja/core";
import { BusEventos, parsearConectoresYaml, registrarManejadoresFalla } from "@forja/core";
import {
  CanalSalidaEnviadorCorreoSmtp,
  construirEnviadorCorreo,
  crearConectores,
  NOMBRE_CONECTOR_CORREO_SMTP,
  type EstadoConectorInfo,
} from "@forja/connectors";
import type { ForjaDb } from "@forja/db";
import {
  RegistradorTraceDrizzle,
  RepositorioAgregacionesSensoresDrizzle,
  RepositorioAreasUsuarioDrizzle,
  RepositorioCatalogoSensoresDrizzle,
  RepositorioChunksDrizzle,
  RepositorioCuarentenaDrizzle,
  RepositorioDocumentosDrizzle,
  RepositorioEjecucionesRutinaDrizzle,
  RepositorioEstadoIngestaDrizzle,
  RepositorioFallasDrizzle,
  RepositorioFeedbackDrizzle,
  RepositorioLecturasDrizzle,
  RepositorioLecturasVentanaDrizzle,
  RepositorioMaquinasDrizzle,
  RepositorioNotificacionesDrizzle,
  RepositorioSensoresPorMaquinaDrizzle,
  RepositorioSnapshotsFallaDrizzle,
  RepositorioSugerenciasMemoriaDrizzle,
  schema,
} from "@forja/db";
import { VercelAiGeneradorEmbeddings, VercelAiProveedorLLM } from "@forja/llm";
import { ExtractorTextoForja, RegistroEstrategiasChunking } from "@forja/rag";
import {
  AlmacenArchivosFs,
  cargarRutinasDesdeDirectorio,
  EnviadorCorreoNoConfigurado,
  EnviadorUiNoOp,
  EnviadorWebhookHttp,
  EscritorArchivosRutinasFs,
  EscritorArchivosWorkspaceFs,
  EscritorMemoriaFs,
  ejecutarRutina,
  ProgramadorRutinas,
  RegistroCanalesSalida,
  RegistroHerramientas,
  WorkspaceLoader,
  type IWorkspaceLoader,
} from "@forja/runtime";
import {
  crearHerramientaBuscarDocumentos,
  crearHerramientaConsultarEstadoSensores,
  crearHerramientaConsultarSensores,
  crearHerramientaCrearReporteFalla,
  crearHerramientaProponerMemoria,
} from "@forja/tools";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type PgBoss from "pg-boss";
import { ColaTrabajosPgBoss } from "./cola-trabajos-pgboss";
import { GeneradorEmbeddingsNoConfigurado } from "./generador-embeddings-no-configurado";
import { ProveedorLLMNoConfigurado } from "./llm-no-configurado";

const HORAS_VENTANA_SNAPSHOT_POR_DEFECTO = 4;
const MODELO_ANTHROPIC_POR_DEFECTO = "claude-3-5-sonnet-latest";
const MODELO_EMBEDDINGS_OPENAI_POR_DEFECTO = "text-embedding-3-small";
const PRESUPUESTO_MAXIMO_POR_EJECUCION_POR_DEFECTO = 100_000;
const PRESUPUESTO_MENSUAL_GLOBAL_POR_DEFECTO = 2_000_000;
const CONFIG_CORREO_SMTP_POR_DEFECTO: ConectorConfigurado = {
  nombre: NOMBRE_CONECTOR_CORREO_SMTP,
  activo: false,
  permisos: {},
  credenciales: {},
  listaBlancaUrls: [],
};

export interface ComposicionRuntime {
  plantId: string;
  workspaceLoader: IWorkspaceLoader;
  registroHerramientas: RegistroHerramientas;
  trace: RegistradorTrace;
  sugerenciasMemoria: RepositorioSugerenciasMemoria;
  escritorMemoria: EscritorMemoria;
  escritorWorkspace: EscritorArchivosWorkspace;
  llm: ProveedorLLM;
  maquinas: RepositorioMaquinas;
  areasUsuario: RepositorioAreasUsuario;
  fallas: RepositorioFallas;
  sensoresPorMaquina: RepositorioSensoresPorMaquina;
  lecturasVentana: RepositorioLecturasVentana;
  snapshotsFalla: RepositorioSnapshotsFalla;
  notificaciones: RepositorioNotificaciones;
  documentos: RepositorioDocumentos;
  chunks: RepositorioChunks;
  feedback: RepositorioFeedback;
  catalogoSensores: RepositorioCatalogoSensores;
  lecturas: RepositorioLecturas;
  cuarentena: RepositorioCuarentena;
  agregacionesSensores: RepositorioAgregacionesSensores;
  estadoIngesta: RepositorioEstadoIngesta;
  almacen: AlmacenArchivos;
  extractor: ExtractorTexto;
  selectorEstrategia: SelectorEstrategiaChunking;
  embeddings: GeneradorEmbeddings;
  cola: ColaTrabajos;
  bus: TipoBusEventos;
  horasVentanaSnapshot: number;
  generarId: () => string;
  ejecucionesRutina: RepositorioEjecucionesRutina;
  escritorRutinas: EscritorArchivosRutinas;
  canalesSalida: RegistroCanalesSalida;
  programadorRutinas: ProgramadorRutinas;
  presupuestoMaximoPorEjecucion: number;
  conectores: {
    obtenerEstados(): readonly EstadoConectorInfo[];
    obtener(nombreConector: string): ConectorActivo | undefined;
  };
  cerrarConectores: () => Promise<void>;
}

function construirProveedorLLM(): ProveedorLLM {
  if (!process.env["ANTHROPIC_API_KEY"]) return new ProveedorLLMNoConfigurado();
  const modelo = process.env["ANTHROPIC_MODEL"] ?? MODELO_ANTHROPIC_POR_DEFECTO;
  return new VercelAiProveedorLLM(anthropic(modelo));
}

function construirGeneradorEmbeddings(): GeneradorEmbeddings {
  if (!process.env["OPENAI_API_KEY"]) return new GeneradorEmbeddingsNoConfigurado();
  const modelo = process.env["OPENAI_EMBEDDING_MODEL"] ?? MODELO_EMBEDDINGS_OPENAI_POR_DEFECTO;
  return new VercelAiGeneradorEmbeddings(openai.textEmbeddingModel(modelo), schema.DIMENSION_EMBEDDING);
}

export async function construirComposicionRuntime(
  db: ForjaDb,
  directorioWorkspace: string,
  directorioDocumentos: string,
  boss: PgBoss,
): Promise<ComposicionRuntime> {
  const [planta] = await db.select().from(schema.plant).limit(1);
  if (!planta) {
    throw new Error(
      "No hay ninguna planta sembrada en la base de datos. Corre `pnpm --filter @forja/db seed` antes de iniciar el servidor.",
    );
  }

  const sugerenciasMemoria = new RepositorioSugerenciasMemoriaDrizzle(db);
  const maquinas = new RepositorioMaquinasDrizzle(db);
  const areasUsuario = new RepositorioAreasUsuarioDrizzle(db);
  const fallas = new RepositorioFallasDrizzle(db);
  const sensoresPorMaquina = new RepositorioSensoresPorMaquinaDrizzle(db);
  const lecturasVentana = new RepositorioLecturasVentanaDrizzle(db);
  const snapshotsFalla = new RepositorioSnapshotsFallaDrizzle(db);
  const notificaciones = new RepositorioNotificacionesDrizzle(db);
  const documentos = new RepositorioDocumentosDrizzle(db);
  const chunks = new RepositorioChunksDrizzle(db);
  const feedback = new RepositorioFeedbackDrizzle(db);
  const catalogoSensores = new RepositorioCatalogoSensoresDrizzle(db);
  const lecturas = new RepositorioLecturasDrizzle(db);
  const cuarentena = new RepositorioCuarentenaDrizzle(db);
  const agregacionesSensores = new RepositorioAgregacionesSensoresDrizzle(db);
  const estadoIngesta = new RepositorioEstadoIngestaDrizzle(db);
  const ejecucionesRutina = new RepositorioEjecucionesRutinaDrizzle(db);
  const almacen = new AlmacenArchivosFs(directorioDocumentos);
  const extractor = new ExtractorTextoForja();
  const selectorEstrategia = new RegistroEstrategiasChunking();
  const embeddings = construirGeneradorEmbeddings();
  const cola = new ColaTrabajosPgBoss(boss);
  const bus = new BusEventos();
  const trace = new RegistradorTraceDrizzle(db);
  const llm = construirProveedorLLM();

  registrarManejadoresFalla(bus, { cola, notificaciones, generarId: randomUUID });

  const registroHerramientas = new RegistroHerramientas();
  registroHerramientas.registrar(
    crearHerramientaProponerMemoria({ sugerencias: sugerenciasMemoria, generarId: randomUUID }),
  );
  registroHerramientas.registrar(crearHerramientaCrearReporteFalla({ maquinas, areasUsuario }));
  registroHerramientas.registrar(crearHerramientaBuscarDocumentos({ embeddings, chunks, areasUsuario }));
  registroHerramientas.registrar(
    crearHerramientaConsultarSensores({ maquinas, areasUsuario, catalogo: catalogoSensores, agregaciones: agregacionesSensores }),
  );
  registroHerramientas.registrar(
    crearHerramientaConsultarEstadoSensores({ maquinas, areasUsuario, catalogo: catalogoSensores, lecturas }),
  );

  const canalesSalida = new RegistroCanalesSalida();
  canalesSalida.registrar("ui", new EnviadorUiNoOp());
  canalesSalida.registrar("webhook", new EnviadorWebhookHttp());
  canalesSalida.registrar("correo", new EnviadorCorreoNoConfigurado());

  let estadosConectoresActuales: EstadoConectorInfo[] = [];
  let registroConectoresActivosActual: { obtener(nombreConector: string): ConectorActivo | undefined } = {
    obtener: () => undefined,
  };
  let nombresHerramientasConectorActuales: string[] = [];
  let cerrarConectoresActuales: () => Promise<void> = async () => {};

  async function leerConectoresYaml(): Promise<string> {
    try {
      return await fs.readFile(path.join(directorioWorkspace, "conectores.yaml"), "utf8");
    } catch {
      return "";
    }
  }

  /**
   * Recarga conectores (spec 17), llamada tanto al iniciar como desde el
   * onRecargar del WorkspaceLoader cuando cambia conectores.yaml (mismo
   * mecanismo de hot-reload que ya usan las rutinas, spec 16). Un
   * conectores.yaml con sintaxis/roles inválidos deja la configuración
   * anterior intacta en vez de tumbar la recarga completa del workspace
   * (que también recarga soul/planta/memoria/rutinas en el mismo evento);
   * un conector individual inválido, en cambio, ya lo maneja crearConectores
   * marcándolo no_disponible sin afectar a los demás.
   */
  async function recargarConectores(): Promise<void> {
    let configuraciones: ConectorConfigurado[];
    try {
      configuraciones = parsearConectoresYaml(await leerConectoresYaml());
    } catch (error) {
      console.error("conectores.yaml inválido; se mantiene la configuración de conectores anterior.", error);
      return;
    }

    await cerrarConectoresActuales();
    for (const nombre of nombresHerramientasConectorActuales) registroHerramientas.desregistrar(nombre);

    const resultado = await crearConectores(configuraciones);
    for (const herramienta of resultado.herramientas) registroHerramientas.registrar(herramienta);

    estadosConectoresActuales = [...resultado.estados];
    registroConectoresActivosActual = resultado.registro;
    nombresHerramientasConectorActuales = resultado.herramientas.map((h) => h.nombre);
    cerrarConectoresActuales = () => resultado.cerrarTodos();

    const configCorreo = configuraciones.find((c) => c.nombre === NOMBRE_CONECTOR_CORREO_SMTP) ?? CONFIG_CORREO_SMTP_POR_DEFECTO;
    canalesSalida.registrar("correo", new CanalSalidaEnviadorCorreoSmtp(construirEnviadorCorreo(configCorreo)));
  }

  await recargarConectores();

  const presupuestoMaximoPorEjecucion = Number(
    process.env["RUTINAS_PRESUPUESTO_MAXIMO_POR_EJECUCION"] ?? PRESUPUESTO_MAXIMO_POR_EJECUCION_POR_DEFECTO,
  );
  const presupuestoMensualGlobal = Number(
    process.env["RUTINAS_PRESUPUESTO_MENSUAL_GLOBAL"] ?? PRESUPUESTO_MENSUAL_GLOBAL_POR_DEFECTO,
  );
  const directorioRutinas = path.join(directorioWorkspace, "rutinas");
  const escritorRutinas = new EscritorArchivosRutinasFs(directorioRutinas);

  const programadorRutinas = new ProgramadorRutinas({
    cargarRutinas: () =>
      cargarRutinasDesdeDirectorio(directorioRutinas, {
        catalogoHerramientas: registroHerramientas,
        presupuestoMaximoGlobal: presupuestoMaximoPorEjecucion,
      }),
    ejecutar: async (rutina) => {
      const config = workspaceLoader.obtenerConfiguracion();
      const systemPrompt = [config.soul, config.planta, config.memoria].filter((s) => s.trim().length > 0).join("\n\n");
      await ejecutarRutina(
        { registro: registroHerramientas, llm, trace, ejecuciones: ejecucionesRutina, canales: canalesSalida, generarId: randomUUID, presupuestoMensualGlobal },
        { rutina, plantId: planta.id, systemPrompt, ahora: new Date() },
      );
    },
  });

  const workspaceLoader = await WorkspaceLoader.iniciar({
    directorio: directorioWorkspace,
    onRecargar: () => {
      void programadorRutinas.recargar();
      void recargarConectores();
    },
  });
  await programadorRutinas.iniciar();

  return {
    plantId: planta.id,
    workspaceLoader,
    registroHerramientas,
    trace,
    sugerenciasMemoria,
    escritorMemoria: new EscritorMemoriaFs(directorioWorkspace),
    escritorWorkspace: new EscritorArchivosWorkspaceFs(directorioWorkspace),
    llm,
    maquinas,
    areasUsuario,
    fallas,
    sensoresPorMaquina,
    lecturasVentana,
    snapshotsFalla,
    notificaciones,
    documentos,
    chunks,
    feedback,
    catalogoSensores,
    lecturas,
    cuarentena,
    agregacionesSensores,
    estadoIngesta,
    almacen,
    extractor,
    selectorEstrategia,
    embeddings,
    cola,
    bus,
    horasVentanaSnapshot: HORAS_VENTANA_SNAPSHOT_POR_DEFECTO,
    generarId: randomUUID,
    ejecucionesRutina,
    escritorRutinas,
    canalesSalida,
    programadorRutinas,
    presupuestoMaximoPorEjecucion,
    conectores: {
      obtenerEstados: () => estadosConectoresActuales,
      obtener: (nombreConector) => registroConectoresActivosActual.obtener(nombreConector),
    },
    cerrarConectores: () => cerrarConectoresActuales(),
  };
}
