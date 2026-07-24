import fs from "node:fs/promises";
import path from "node:path";
import type { ArchivoWorkspaceEditable, EscritorArchivosWorkspace } from "@forja/core";

const NOMBRE_ARCHIVO: Record<ArchivoWorkspaceEditable, string> = {
  soul: "soul.md",
  planta: "planta.md",
};

export class EscritorArchivosWorkspaceFs implements EscritorArchivosWorkspace {
  constructor(private readonly directorio: string) {}

  async leer(archivo: ArchivoWorkspaceEditable): Promise<string> {
    try {
      return await fs.readFile(path.join(this.directorio, NOMBRE_ARCHIVO[archivo]), "utf8");
    } catch {
      return "";
    }
  }

  async escribir(archivo: ArchivoWorkspaceEditable, contenido: string): Promise<void> {
    await fs.mkdir(this.directorio, { recursive: true });
    await fs.writeFile(path.join(this.directorio, NOMBRE_ARCHIVO[archivo]), contenido, "utf8");
  }
}
