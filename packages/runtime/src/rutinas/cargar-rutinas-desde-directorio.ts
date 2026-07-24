import fs from "node:fs/promises";
import path from "node:path";
import { parsearRutina, type CatalogoHerramientas, type RutinaProgramada } from "@forja/core";

export interface ErrorCargaRutina {
  readonly archivo: string;
  readonly error: string;
}

export interface ResultadoCargaRutinas {
  readonly rutinas: readonly RutinaProgramada[];
  readonly errores: readonly ErrorCargaRutina[];
}

export interface DependenciasCargarRutinas {
  catalogoHerramientas: CatalogoHerramientas;
  presupuestoMaximoGlobal: number;
}

/**
 * Lee y valida cada workspace/rutinas/*.md. Un archivo inválido (frontmatter
 * roto, herramienta de escritura, cron inválido, etc.) no tumba la carga:
 * queda fuera de `rutinas` y su error visible en `errores` (admin lo lista).
 */
export async function cargarRutinasDesdeDirectorio(
  directorio: string,
  deps: DependenciasCargarRutinas,
): Promise<ResultadoCargaRutinas> {
  let archivos: string[];
  try {
    archivos = (await fs.readdir(directorio)).filter((nombre) => nombre.endsWith(".md"));
  } catch {
    return { rutinas: [], errores: [] };
  }

  const rutinas: RutinaProgramada[] = [];
  const errores: ErrorCargaRutina[] = [];

  for (const nombreArchivo of archivos) {
    const ruta = path.join(directorio, nombreArchivo);
    try {
      const contenido = await fs.readFile(ruta, "utf8");
      rutinas.push(parsearRutina(deps, { contenidoArchivo: contenido }));
    } catch (error) {
      errores.push({ archivo: nombreArchivo, error: error instanceof Error ? error.message : "error desconocido" });
    }
  }

  return { rutinas, errores };
}
