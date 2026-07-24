import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AlmacenArchivos } from "@forja/core";

/** Adapter del puerto AlmacenArchivos: guarda el binario original en disco local. */
export class AlmacenArchivosFs implements AlmacenArchivos {
  constructor(private readonly directorio: string) {}

  async guardar(nombreSugerido: string, contenido: Buffer): Promise<string> {
    await fs.mkdir(this.directorio, { recursive: true });
    const nombreArchivo = `${randomUUID()}-${nombreSugerido.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const ruta = path.join(this.directorio, nombreArchivo);
    await fs.writeFile(ruta, contenido);
    return ruta;
  }

  async leer(ruta: string): Promise<Buffer> {
    return fs.readFile(ruta);
  }
}
