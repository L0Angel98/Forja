import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceLoader } from "../loader";

let directorio: string;
let loader: WorkspaceLoader | undefined;

beforeEach(async () => {
  directorio = await fs.mkdtemp(path.join(os.tmpdir(), "forja-workspace-"));
});

afterEach(async () => {
  loader?.detener();
  loader = undefined;
  await fs.rm(directorio, { recursive: true, force: true });
});

describe("WorkspaceLoader", () => {
  it("usa valores por defecto y advierte cuando faltan soul.md/planta.md", async () => {
    loader = await WorkspaceLoader.iniciar({ directorio });
    const config = loader.obtenerConfiguracion();

    expect(config.soul).toContain("Forja");
    expect(config.advertencias.some((a) => a.includes("soul.md"))).toBe(true);
    expect(config.advertencias.some((a) => a.includes("planta.md"))).toBe(true);
  });

  it("carga el contenido real cuando los archivos existen", async () => {
    await fs.writeFile(path.join(directorio, "soul.md"), "Eres Forja, sé breve.", "utf8");
    await fs.writeFile(path.join(directorio, "planta.md"), "Turno matutino 6-14h.", "utf8");
    await fs.writeFile(path.join(directorio, "memoria.md"), "", "utf8");

    loader = await WorkspaceLoader.iniciar({ directorio });
    const config = loader.obtenerConfiguracion();

    expect(config.soul).toBe("Eres Forja, sé breve.");
    expect(config.planta).toBe("Turno matutino 6-14h.");
    expect(config.advertencias).toHaveLength(0);
  });

  it("recargar() refleja una edición del archivo sin reiniciar el proceso", async () => {
    await fs.writeFile(path.join(directorio, "soul.md"), "Versión 1", "utf8");
    loader = await WorkspaceLoader.iniciar({ directorio });
    expect(loader.obtenerConfiguracion().soul).toBe("Versión 1");

    await fs.writeFile(path.join(directorio, "soul.md"), "Versión 2", "utf8");
    const config = await loader.recargar();

    expect(config.soul).toBe("Versión 2");
    expect(loader.obtenerConfiguracion().soul).toBe("Versión 2");
  });

  it("un archivo de rutina con frontmatter inválido se reporta sin tumbar el resto", async () => {
    const rutinas = path.join(directorio, "rutinas");
    await fs.mkdir(rutinas, { recursive: true });
    await fs.writeFile(
      path.join(rutinas, "valida.md"),
      "---\nnombre: resumen-diario\ncron: \"0 6 * * *\"\n---\nResume las fallas.",
      "utf8",
    );
    await fs.writeFile(path.join(rutinas, "sin-frontmatter.md"), "esto no tiene frontmatter", "utf8");
    await fs.writeFile(path.join(rutinas, "yaml-roto.md"), "---\nnombre: [esto no cierra\n---\ntexto", "utf8");

    loader = await WorkspaceLoader.iniciar({ directorio });
    const { archivosInvalidos } = loader.obtenerConfiguracion();

    const rutasInvalidas = archivosInvalidos.map((a) => a.ruta);
    expect(rutasInvalidas).toContain("sin-frontmatter.md");
    expect(rutasInvalidas).toContain("yaml-roto.md");
    expect(rutasInvalidas).not.toContain("valida.md");
  });

  it("hot reload: editar un archivo dispara onRecargar sin llamar recargar() manualmente", async () => {
    await fs.writeFile(path.join(directorio, "soul.md"), "Antes", "utf8");
    let ultimaConfig: string | undefined;

    loader = await WorkspaceLoader.iniciar({
      directorio,
      debounceMs: 50,
      onRecargar: (config) => {
        ultimaConfig = config.soul;
      },
    });

    await fs.writeFile(path.join(directorio, "soul.md"), "Después", "utf8");

    await new Promise<void>((resolve, reject) => {
      const inicio = Date.now();
      const intervalo = setInterval(() => {
        if (ultimaConfig === "Después") {
          clearInterval(intervalo);
          resolve();
        } else if (Date.now() - inicio > 5000) {
          clearInterval(intervalo);
          reject(new Error("El hot reload no se disparó a tiempo"));
        }
      }, 50);
    });

    expect(loader.obtenerConfiguracion().soul).toBe("Después");
  }, 10_000);
});
