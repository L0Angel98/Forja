import { calcularDiffLineas } from "../diff-lineas";
import { ArchivoWorkspaceDemasiadoGrande } from "../errors/archivo-workspace-demasiado-grande";
import type { ArchivoWorkspaceEditable } from "../entities/workspace";
import { TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES } from "../entities/workspace";
import type { EscritorArchivosWorkspace } from "../ports/escritor-archivos-workspace";
import type { RegistradorAuditoria } from "../ports/registrador-auditoria";

export interface DependenciasEditarArchivoWorkspace {
  workspace: EscritorArchivosWorkspace;
  auditoria: RegistradorAuditoria;
}

export interface ParametrosEditarArchivoWorkspace {
  archivo: ArchivoWorkspaceEditable;
  contenidoNuevo: string;
  adminId: string;
  ip: string;
  ahora: Date;
}

export interface ResultadoEditarArchivoWorkspace {
  diff: string;
}

export async function editarArchivoWorkspace(
  deps: DependenciasEditarArchivoWorkspace,
  params: ParametrosEditarArchivoWorkspace,
): Promise<ResultadoEditarArchivoWorkspace> {
  if (Buffer.byteLength(params.contenidoNuevo, "utf8") > TAMANO_MAXIMO_ARCHIVO_WORKSPACE_BYTES) {
    throw new ArchivoWorkspaceDemasiadoGrande();
  }

  const anterior = await deps.workspace.leer(params.archivo);
  const diff = calcularDiffLineas(anterior, params.contenidoNuevo);

  await deps.workspace.escribir(params.archivo, params.contenidoNuevo);
  await deps.auditoria.registrar({
    tipo: "workspace_editado",
    ip: params.ip,
    usuarioId: params.adminId,
    ocurridoEn: params.ahora,
    detalle: { archivo: params.archivo, diff },
  });

  return { diff };
}
