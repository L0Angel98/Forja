import { SugerenciaMemoriaNoEncontrada } from "../errors/sugerencia-memoria-no-encontrada";
import { SugerenciaMemoriaYaResuelta } from "../errors/sugerencia-memoria-ya-resuelta";
import type { EscritorMemoria } from "../ports/escritor-memoria";
import type { RegistradorAuditoria } from "../ports/registrador-auditoria";
import type { RepositorioSugerenciasMemoria } from "../ports/repositorio-sugerencias-memoria";

export interface DependenciasAprobarSugerenciaMemoria {
  sugerencias: RepositorioSugerenciasMemoria;
  escritorMemoria: EscritorMemoria;
  auditoria: RegistradorAuditoria;
}

export interface ParametrosAprobarSugerenciaMemoria {
  sugerenciaId: string;
  adminId: string;
  ip: string;
  ahora: Date;
}

export async function aprobarSugerenciaMemoria(
  deps: DependenciasAprobarSugerenciaMemoria,
  params: ParametrosAprobarSugerenciaMemoria,
): Promise<void> {
  const sugerencia = await deps.sugerencias.buscarPorId(params.sugerenciaId);
  if (!sugerencia) throw new SugerenciaMemoriaNoEncontrada();
  if (sugerencia.estado !== "pendiente") throw new SugerenciaMemoriaYaResuelta();

  await deps.escritorMemoria.agregarEntrada(sugerencia.contenido);
  await deps.sugerencias.actualizarEstado(sugerencia.id, "aprobada");
  await deps.auditoria.registrar({
    tipo: "memoria_aprobada",
    ip: params.ip,
    usuarioId: params.adminId,
    ocurridoEn: params.ahora,
    detalle: { sugerenciaId: sugerencia.id, contenido: sugerencia.contenido },
  });
}
