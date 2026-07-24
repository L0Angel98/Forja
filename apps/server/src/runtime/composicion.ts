import { randomUUID } from "node:crypto";
import type {
  AlmacenArchivos,
  BusEventos as TipoBusEventos,
  ColaTrabajos,
  EscritorMemoria,
  EscritorArchivosWorkspace,
  ExtractorTexto,
  GeneradorEmbeddings,
  ProveedorLLM,
  RegistradorTrace,
  RepositorioAreasUsuario,
  RepositorioChunks,
  RepositorioDocumentos,
  RepositorioFallas,
  RepositorioFeedback,
  RepositorioLecturasVentana,
  RepositorioMaquinas,
  RepositorioNotificaciones,
  RepositorioSensoresPorMaquina,
  RepositorioSnapshotsFalla,
  RepositorioSugerenciasMemoria,
  SelectorEstrategiaChunking,
} from "@forja/core";
import { BusEventos, registrarManejadoresFalla } from "@forja/core";
import type { ForjaDb } from "@forja/db";
import {
  RegistradorTraceDrizzle,
  RepositorioAreasUsuarioDrizzle,
  RepositorioChunksDrizzle,
  RepositorioDocumentosDrizzle,
  RepositorioFallasDrizzle,
  RepositorioFeedbackDrizzle,
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
  EscritorArchivosWorkspaceFs,
  EscritorMemoriaFs,
  RegistroHerramientas,
  WorkspaceLoader,
  type IWorkspaceLoader,
} from "@forja/runtime";
import {
  crearHerramientaBuscarDocumentos,
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
  almacen: AlmacenArchivos;
  extractor: ExtractorTexto;
  selectorEstrategia: SelectorEstrategiaChunking;
  embeddings: GeneradorEmbeddings;
  cola: ColaTrabajos;
  bus: TipoBusEventos;
  horasVentanaSnapshot: number;
  generarId: () => string;
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

  const workspaceLoader = await WorkspaceLoader.iniciar({ directorio: directorioWorkspace });
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
  const almacen = new AlmacenArchivosFs(directorioDocumentos);
  const extractor = new ExtractorTextoForja();
  const selectorEstrategia = new RegistroEstrategiasChunking();
  const embeddings = construirGeneradorEmbeddings();
  const cola = new ColaTrabajosPgBoss(boss);
  const bus = new BusEventos();

  registrarManejadoresFalla(bus, { cola, notificaciones, generarId: randomUUID });

  const registroHerramientas = new RegistroHerramientas();
  registroHerramientas.registrar(
    crearHerramientaProponerMemoria({ sugerencias: sugerenciasMemoria, generarId: randomUUID }),
  );
  registroHerramientas.registrar(crearHerramientaCrearReporteFalla({ maquinas, areasUsuario }));
  registroHerramientas.registrar(crearHerramientaBuscarDocumentos({ embeddings, chunks, areasUsuario }));

  return {
    plantId: planta.id,
    workspaceLoader,
    registroHerramientas,
    trace: new RegistradorTraceDrizzle(db),
    sugerenciasMemoria,
    escritorMemoria: new EscritorMemoriaFs(directorioWorkspace),
    escritorWorkspace: new EscritorArchivosWorkspaceFs(directorioWorkspace),
    llm: construirProveedorLLM(),
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
    almacen,
    extractor,
    selectorEstrategia,
    embeddings,
    cola,
    bus,
    horasVentanaSnapshot: HORAS_VENTANA_SNAPSHOT_POR_DEFECTO,
    generarId: randomUUID,
  };
}
