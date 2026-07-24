import { watch, type FSWatcher } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { ArchivoWorkspaceInvalido, ConfiguracionWorkspace } from "@forja/core";
import { TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES } from "@forja/core";
import { parse as parseYaml } from "yaml";
import { PLANTA_POR_DEFECTO, SOUL_POR_DEFECTO } from "./defaults";

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;

export interface OpcionesWorkspaceLoader {
  readonly directorio: string;
  readonly debounceMs?: number;
  readonly onRecargar?: (config: ConfiguracionWorkspace) => void;
}

export interface IWorkspaceLoader {
  obtenerConfiguracion(): ConfiguracionWorkspace;
  recargar(): Promise<ConfiguracionWorkspace>;
  detener(): void;
}

export class WorkspaceLoader implements IWorkspaceLoader {
  private config: ConfiguracionWorkspace;
  private watcher: FSWatcher | undefined;
  private temporizador: NodeJS.Timeout | undefined;

  private constructor(
    private readonly directorio: string,
    private readonly debounceMs: number,
    private readonly onRecargar: ((config: ConfiguracionWorkspace) => void) | undefined,
    configInicial: ConfiguracionWorkspace,
  ) {
    this.config = configInicial;
  }

  static async iniciar(opciones: OpcionesWorkspaceLoader): Promise<WorkspaceLoader> {
    const config = await cargarConfiguracion(opciones.directorio);
    const loader = new WorkspaceLoader(opciones.directorio, opciones.debounceMs ?? 2000, opciones.onRecargar, config);
    await loader.observar();
    return loader;
  }

  obtenerConfiguracion(): ConfiguracionWorkspace {
    return this.config;
  }

  async recargar(): Promise<ConfiguracionWorkspace> {
    this.config = await cargarConfiguracion(this.directorio);
    this.onRecargar?.(this.config);
    return this.config;
  }

  detener(): void {
    this.watcher?.close();
    if (this.temporizador) clearTimeout(this.temporizador);
  }

  private async observar(): Promise<void> {
    await fs.mkdir(this.directorio, { recursive: true });
    this.watcher = watch(this.directorio, { recursive: true }, () => {
      if (this.temporizador) clearTimeout(this.temporizador);
      this.temporizador = setTimeout(() => {
        void this.recargar();
      }, this.debounceMs);
    });
  }
}

async function leerArchivoOPorDefecto(
  ruta: string,
  contenidoPorDefecto: string,
  advertencias: string[],
): Promise<string> {
  try {
    const contenido = await fs.readFile(ruta, "utf8");
    if (Buffer.byteLength(contenido, "utf8") > TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES) {
      advertencias.push(
        `${path.basename(ruta)} supera ${TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES / 1024}KB; se usa igual pero conviene recortarlo.`,
      );
    }
    return contenido;
  } catch {
    advertencias.push(`${path.basename(ruta)} no encontrado, usando el valor por defecto.`);
    return contenidoPorDefecto;
  }
}

async function detectarArchivosInvalidosEnRutinas(directorioRutinas: string): Promise<ArchivoWorkspaceInvalido[]> {
  const invalidos: ArchivoWorkspaceInvalido[] = [];
  let archivos: string[];

  try {
    archivos = (await fs.readdir(directorioRutinas)).filter((nombre) => nombre.endsWith(".md"));
  } catch {
    return invalidos;
  }

  for (const nombreArchivo of archivos) {
    const ruta = path.join(directorioRutinas, nombreArchivo);
    try {
      const contenido = await fs.readFile(ruta, "utf8");
      const coincidencia = FRONTMATTER.exec(contenido);
      if (!coincidencia) {
        invalidos.push({ ruta: nombreArchivo, error: "Falta el frontmatter YAML (bloque --- ... ---)." });
        continue;
      }
      parseYaml(coincidencia[1] ?? "");
    } catch (error) {
      invalidos.push({
        ruta: nombreArchivo,
        error: error instanceof Error ? error.message : "YAML inválido.",
      });
    }
  }

  return invalidos;
}

async function cargarConfiguracion(directorio: string): Promise<ConfiguracionWorkspace> {
  const advertencias: string[] = [];
  const soul = await leerArchivoOPorDefecto(path.join(directorio, "soul.md"), SOUL_POR_DEFECTO, advertencias);
  const planta = await leerArchivoOPorDefecto(path.join(directorio, "planta.md"), PLANTA_POR_DEFECTO, advertencias);
  const memoria = await leerArchivoOPorDefecto(path.join(directorio, "memoria.md"), "", advertencias);
  const archivosInvalidos = await detectarArchivosInvalidosEnRutinas(path.join(directorio, "rutinas"));

  return { soul, planta, memoria, advertencias, archivosInvalidos };
}
