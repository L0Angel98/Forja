import { SugerenciaMemoriaNoEncontrada } from "../errors/sugerencia-memoria-no-encontrada";
import { SugerenciaMemoriaYaResuelta } from "../errors/sugerencia-memoria-ya-resuelta";
import type { RegistradorAuditoria } from "../ports/registrador-auditoria";
import type { RepositorioSugerenciasMemoria } from "../ports/repositorio-sugerencias-memoria";

export interface DependenciasRechazarSugerenciaMemoria {
  sugerencias: RepositorioSugerenciasMemoria;
  auditoria: RegistradorAuditoria;
}

export interface ParametrosRechazarSugerenciaMemoria {
  sugerenciaId: string;
  adminId: string;
  ip: string;
  ahora: Date;
}

export async function rechazarSugerenciaMemoria(
  deps: DependenciasRechazarSugerenciaMemoria,
  params: ParametrosRechazarSugerenciaMemoria,
): Promise<void> {
  const sugerencia = await deps.sugerencias.buscarPorId(params.sugerenciaId);
  if (!sugerencia) throw new SugerenciaMemoriaNoEncontrada();
  if (sugerencia.estado !== "pendiente") throw new SugerenciaMemoriaYaResuelta();

  await deps.sugerencias.actualizarEstado(sugerencia.id, "rechazada");
  await deps.auditoria.registrar({
    tipo: "memoria_rechazada",
    ip: params.ip,
    usuarioId: params.adminId,
    ocurridoEn: params.ahora,
    detalle: { sugerenciaId: sugerencia.id },
  });
}
