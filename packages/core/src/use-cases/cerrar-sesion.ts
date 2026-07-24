import type { RegistradorAuditoria } from "../ports/registrador-auditoria";
import type { RepositorioSesiones } from "../ports/repositorio-sesiones";

export interface DependenciasCerrarSesion {
  sesiones: RepositorioSesiones;
  auditoria: RegistradorAuditoria;
}

export interface ParametrosCerrarSesion {
  sesionId: string;
  ip: string;
  ahora: Date;
}

export async function cerrarSesion(
  deps: DependenciasCerrarSesion,
  params: ParametrosCerrarSesion,
): Promise<void> {
  const { sesiones, auditoria } = deps;
  const { sesionId, ip, ahora } = params;

  const sesion = await sesiones.buscarPorId(sesionId);
  if (!sesion) return;

  await sesiones.eliminar(sesionId);
  await auditoria.registrar({ tipo: "logout", ip, usuarioId: sesion.usuarioId, ocurridoEn: ahora });
}
