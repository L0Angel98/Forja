import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EscritorArchivosWorkspaceFs } from "../escritor-archivos-workspace-fs";
import { EscritorMemoriaFs } from "../escritor-memoria-fs";

let directorio: string;

beforeEach(async () => {
  directorio = await fs.mkdtemp(path.join(os.tmpdir(), "forja-escritores-"));
});

afterEach(async () => {
  await fs.rm(directorio, { recursive: true, force: true });
});

describe("EscritorArchivosWorkspaceFs", () => {
  it("lee vacío si el archivo no existe y luego refleja lo escrito", async () => {
    const escritor = new EscritorArchivosWorkspaceFs(directorio);

    expect(await escritor.leer("soul")).toBe("");

    await escritor.escribir("soul", "contenido nuevo");

    expect(await escritor.leer("soul")).toBe("contenido nuevo");
    expect(await fs.readFile(path.join(directorio, "soul.md"), "utf8")).toBe("contenido nuevo");
  });
});

describe("EscritorMemoriaFs", () => {
  it("agrega entradas como lista al final de memoria.md", async () => {
    const escritor = new EscritorMemoriaFs(directorio);

    await escritor.agregarEntrada("El torno 3 vibra más los lunes");
    await escritor.agregarEntrada("El sensor de la línea 2 se desconecta de noche");

    const contenido = await fs.readFile(path.join(directorio, "memoria.md"), "utf8");
    expect(contenido).toBe(
      "- El torno 3 vibra más los lunes\n- El sensor de la línea 2 se desconecta de noche\n",
    );
  });
});
