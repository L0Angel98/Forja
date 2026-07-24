import { randomUUID } from "node:crypto";
import type {
  EscritorMemoria,
  EscritorArchivosWorkspace,
  RegistradorTrace,
  RepositorioSugerenciasMemoria,
} from "@forja/core";
import type { ForjaDb } from "@forja/db";
import { RegistradorTraceDrizzle, RepositorioSugerenciasMemoriaDrizzle } from "@forja/db";
import {
  EscritorArchivosWorkspaceFs,
  EscritorMemoriaFs,
  RegistroHerramientas,
  WorkspaceLoader,
  type IWorkspaceLoader,
} from "@forja/runtime";
import { crearHerramientaProponerMemoria } from "@forja/tools";

export interface ComposicionRuntime {
  workspaceLoader: IWorkspaceLoader;
  registroHerramientas: RegistroHerramientas;
  trace: RegistradorTrace;
  sugerenciasMemoria: RepositorioSugerenciasMemoria;
  escritorMemoria: EscritorMemoria;
  escritorWorkspace: EscritorArchivosWorkspace;
  generarId: () => string;
}

export async function construirComposicionRuntime(
  db: ForjaDb,
  directorioWorkspace: string,
): Promise<ComposicionRuntime> {
  const workspaceLoader = await WorkspaceLoader.iniciar({ directorio: directorioWorkspace });
  const sugerenciasMemoria = new RepositorioSugerenciasMemoriaDrizzle(db);
  const registroHerramientas = new RegistroHerramientas();

  registroHerramientas.registrar(
    crearHerramientaProponerMemoria({ sugerencias: sugerenciasMemoria, generarId: randomUUID }),
  );

  return {
    workspaceLoader,
    registroHerramientas,
    trace: new RegistradorTraceDrizzle(db),
    sugerenciasMemoria,
    escritorMemoria: new EscritorMemoriaFs(directorioWorkspace),
    escritorWorkspace: new EscritorArchivosWorkspaceFs(directorioWorkspace),
    generarId: randomUUID,
  };
}
