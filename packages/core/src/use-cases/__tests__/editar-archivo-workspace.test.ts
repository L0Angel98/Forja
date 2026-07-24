import { describe, expect, it } from "vitest";
import { editarArchivoWorkspace } from "../editar-archivo-workspace";
import { ArchivoWorkspaceDemasiadoGrande } from "../../errors/archivo-workspace-demasiado-grande";
import { TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES } from "../../entities/workspace";
import { crearEscritorArchivosWorkspaceFalso, crearRegistradorAuditoriaMemoria } from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");
const IP = "10.0.0.1";
const ADMIN_ID = "admin-1";

describe("editarArchivoWorkspace", () => {
  it("escribe el archivo, devuelve el diff y audita con el detalle", async () => {
    const workspace = crearEscritorArchivosWorkspaceFalso({ soul: "Eres Forja.\nSé breve." });
    const auditoria = crearRegistradorAuditoriaMemoria();

    const resultado = await editarArchivoWorkspace(
      { workspace, auditoria },
      { archivo: "soul", contenidoNuevo: "Eres Forja.\nSé formal.", adminId: ADMIN_ID, ip: IP, ahora: AHORA },
    );

    expect(await workspace.leer("soul")).toBe("Eres Forja.\nSé formal.");
    expect(resultado.diff).toBe("-Sé breve.\n+Sé formal.");
    expect(auditoria.eventos).toContainEqual(
      expect.objectContaining({
        tipo: "workspace_editado",
        usuarioId: ADMIN_ID,
        detalle: { archivo: "soul", diff: resultado.diff },
      }),
    );
  });

  it("rechaza contenido que excede el tamaño máximo", async () => {
    const workspace = crearEscritorArchivosWorkspaceFalso();
    const auditoria = crearRegistradorAuditoriaMemoria();
    const contenidoGigante = "a".repeat(TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES + 1);

    await expect(
      editarArchivoWorkspace(
        { workspace, auditoria },
        { archivo: "planta", contenidoNuevo: contenidoGigante, adminId: ADMIN_ID, ip: IP, ahora: AHORA },
      ),
    ).rejects.toThrow(ArchivoWorkspaceDemasiadoGrande);

    expect(auditoria.eventos).toHaveLength(0);
  });
});
