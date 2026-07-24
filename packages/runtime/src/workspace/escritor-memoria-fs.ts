import fs from "node:fs/promises";
import path from "node:path";
import type { EscritorMemoria } from "@forja/core";

export class EscritorMemoriaFs implements EscritorMemoria {
  constructor(private readonly directorio: string) {}

  async agregarEntrada(texto: string): Promise<void> {
    await fs.mkdir(this.directorio, { recursive: true });
    const ruta = path.join(this.directorio, "memoria.md");
    const actual = await fs.readFile(ruta, "utf8").catch(() => "");
    const separador = actual.length > 0 && !actual.endsWith("\n") ? "\n" : "";
    await fs.writeFile(ruta, `${actual}${separador}- ${texto}\n`, "utf8");
  }
}
