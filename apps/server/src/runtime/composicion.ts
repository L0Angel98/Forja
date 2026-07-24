import { randomUUID } from "node:crypto";
import type {
  BusEventos as TipoBusEventos,
  ColaTrabajos,
  EscritorMemoria,
  EscritorArchivosWorkspace,
  ProveedorLLM,
  RegistradorTrace,
  RepositorioAreasUsuario,
  RepositorioFallas,
  RepositorioLecturasVentana,
  RepositorioMaquinas,
  RepositorioNotificaciones,
  RepositorioSensoresPorMaquina,
  RepositorioSnapshotsFalla,
  RepositorioSugerenciasMemoria,
} from "@forja/core";
import { BusEventos, registrarManejadoresFalla } from "@forja/core";
import type { ForjaDb } from "@forja/db";
import {
  RegistradorTraceDrizzle,
  RepositorioAreasUsuarioDrizzle,
  RepositorioFallasDrizzle,
  RepositorioLecturasVentanaDrizzle,
  RepositorioMaquinasDrizzle,
  RepositorioNotificacionesDrizzle,
  RepositorioSensoresPorMaquinaDrizzle,
  RepositorioSnapshotsFallaDrizzle,
  RepositorioSugerenciasMemoriaDrizzle,
  schema,
} from "@forja/db";
import {
  EscritorArchivosWorkspaceFs,
  EscritorMemoriaFs,
  RegistroHerramientas,
  WorkspaceLoader,
  type IWorkspaceLoader,
} from "@forja/runtime";
import { crearHerramientaCrearReporteFalla, crearHerramientaProponerMemoria } from "@forja/tools";
import type PgBoss from "pg-boss";
import { ColaTrabajosPgBoss } from "./cola-trabajos-pgboss";
import { ProveedorLLMNoConfigurado } from "./llm-no-configurado";

const HORAS_VENTANA_SNAPSHOT_POR_DEFECTO = 4;

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
  cola: ColaTrabajos;
  bus: TipoBusEventos;
  horasVentanaSnapshot: number;
  generarId: () => string;
}

export async function construirComposicionRuntime(
  db: ForjaDb,
  directorioWorkspace: string,
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
  const cola = new ColaTrabajosPgBoss(boss);
  const bus = new BusEventos();

  registrarManejadoresFalla(bus, { cola, notificaciones, generarId: randomUUID });

  const registroHerramientas = new RegistroHerramientas();
  registroHerramientas.registrar(
    crearHerramientaProponerMemoria({ sugerencias: sugerenciasMemoria, generarId: randomUUID }),
  );
  registroHerramientas.registrar(crearHerramientaCrearReporteFalla({ maquinas, areasUsuario }));

  return {
    plantId: planta.id,
    workspaceLoader,
    registroHerramientas,
    trace: new RegistradorTraceDrizzle(db),
    sugerenciasMemoria,
    escritorMemoria: new EscritorMemoriaFs(directorioWorkspace),
    escritorWorkspace: new EscritorArchivosWorkspaceFs(directorioWorkspace),
    llm: new ProveedorLLMNoConfigurado(),
    maquinas,
    areasUsuario,
    fallas,
    sensoresPorMaquina,
    lecturasVentana,
    snapshotsFalla,
    notificaciones,
    cola,
    bus,
    horasVentanaSnapshot: HORAS_VENTANA_SNAPSHOT_POR_DEFECTO,
    generarId: randomUUID,
  };
}
