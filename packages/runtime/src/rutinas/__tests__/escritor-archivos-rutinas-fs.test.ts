import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EscritorArchivosRutinasFs } from "../escritor-archivos-rutinas-fs";

let directorio: string;

beforeEach(async () => {
  directorio = await fs.mkdtemp(path.join(os.tmpdir(), "forja-rutinas-"));
});

afterEach(async () => {
  await fs.rm(directorio, { recursive: true, force: true });
});

describe("EscritorArchivosRutinasFs", () => {
  it("leer() devuelve null si el archivo no existe", async () => {
    const escritor = new EscritorArchivosRutinasFs(directorio);
    expect(await escritor.leer("no-existe")).toBeNull();
  });

  it("escribe, lee y lista rutinas", async () => {
    const escritor = new EscritorArchivosRutinasFs(directorio);

    await escritor.escribir("resumen-diario", "---\nnombre: resumen-diario\n---\nprompt");

    expect(await escritor.leer("resumen-diario")).toBe("---\nnombre: resumen-diario\n---\nprompt");
    expect(await escritor.listar()).toEqual(["resumen-diario"]);
    expect(await fs.readFile(path.join(directorio, "resumen-diario.md"), "utf8")).toBe(
      "---\nnombre: resumen-diario\n---\nprompt",
    );
  });

  it("eliminar() borra el archivo y es idempotente si ya no existe", async () => {
    const escritor = new EscritorArchivosRutinasFs(directorio);
    await escritor.escribir("resumen-diario", "contenido");

    await escritor.eliminar("resumen-diario");
    expect(await escritor.leer("resumen-diario")).toBeNull();

    await expect(escritor.eliminar("resumen-diario")).resolves.toBeUndefined();
  });

  it("listar() devuelve [] si el directorio de rutinas no existe todavía", async () => {
    const escritor = new EscritorArchivosRutinasFs(path.join(directorio, "no-creado-aun"));
    expect(await escritor.listar()).toEqual([]);
  });

  it("rechaza nombres que podrían escapar el directorio de rutinas (path traversal)", async () => {
    const escritor = new EscritorArchivosRutinasFs(directorio);

    await expect(escritor.escribir("../fuera", "malicioso")).rejects.toThrow();
    await expect(escritor.leer("../../etc/passwd")).resolves.toBeNull();
  });
});
