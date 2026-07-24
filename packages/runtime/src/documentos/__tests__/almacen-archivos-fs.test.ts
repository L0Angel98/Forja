import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AlmacenArchivosFs } from "../almacen-archivos-fs";

let directorio: string;

beforeEach(async () => {
  directorio = await fs.mkdtemp(path.join(os.tmpdir(), "forja-almacen-"));
});

afterEach(async () => {
  await fs.rm(directorio, { recursive: true, force: true });
});

describe("AlmacenArchivosFs", () => {
  it("guarda el binario y lo devuelve tal cual al leerlo por su ruta", async () => {
    const almacen = new AlmacenArchivosFs(directorio);
    const contenido = Buffer.from("contenido binario de prueba");

    const ruta = await almacen.guardar("Manual Torno.pdf", contenido);

    expect(ruta.startsWith(directorio)).toBe(true);
    expect(await almacen.leer(ruta)).toEqual(contenido);
  });

  it("dos archivos con el mismo nombre sugerido no se pisan", async () => {
    const almacen = new AlmacenArchivosFs(directorio);

    const ruta1 = await almacen.guardar("manual.pdf", Buffer.from("uno"));
    const ruta2 = await almacen.guardar("manual.pdf", Buffer.from("dos"));

    expect(ruta1).not.toBe(ruta2);
    expect(await almacen.leer(ruta1)).toEqual(Buffer.from("uno"));
    expect(await almacen.leer(ruta2)).toEqual(Buffer.from("dos"));
  });

  it("sanitiza caracteres no seguros del nombre sugerido", async () => {
    const almacen = new AlmacenArchivosFs(directorio);

    const ruta = await almacen.guardar("manual raro/../con espacios & símbolos!.pdf", Buffer.from("x"));

    expect(path.dirname(ruta)).toBe(directorio);
  });
});
