import fs from "node:fs/promises";
import path from "node:path";
import type { EscritorArchivosRutinas } from "@forja/core";

/** Solo minúsculas/números/guiones: el nombre se usa directo como archivo, esto descarta cualquier intento de path traversal. */
const NOMBRE_VALIDO = /^[a-z0-9-]+$/;

export class EscritorArchivosRutinasFs implements EscritorArchivosRutinas {
  constructor(private readonly directorioRutinas: string) {}

  async listar(): Promise<string[]> {
    try {
      const archivos = await fs.readdir(this.directorioRutinas);
      return archivos.filter((nombre) => nombre.endsWith(".md")).map((nombre) => nombre.replace(/\.md$/, ""));
    } catch {
      return [];
    }
  }

  async leer(nombre: string): Promise<string | null> {
    try {
      return await fs.readFile(this.ruta(nombre), "utf8");
    } catch {
      return null;
    }
  }

  async escribir(nombre: string, contenido: string): Promise<void> {
    await fs.mkdir(this.directorioRutinas, { recursive: true });
    await fs.writeFile(this.ruta(nombre), contenido, "utf8");
  }

  async eliminar(nombre: string): Promise<void> {
    try {
      await fs.unlink(this.ruta(nombre));
    } catch {
      // ya no existe: eliminar es idempotente
    }
  }

  private ruta(nombre: string): string {
    if (!NOMBRE_VALIDO.test(nombre)) {
      throw new Error(`Nombre de rutina inválido: "${nombre}".`);
    }
    return path.join(this.directorioRutinas, `${nombre}.md`);
  }
}
