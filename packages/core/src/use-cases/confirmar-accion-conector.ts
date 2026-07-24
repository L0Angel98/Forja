import type { Usuario } from "../entities/usuario";
import { ConectorDesconocido } from "../errors/conector-desconocido";
import { PermisoDenegado } from "../errors/permiso-denegado";
import type { RegistradorTrace } from "../ports/registrador-trace";
import type { RegistroConectoresActivos } from "../ports/registro-conectores-activos";

export interface DependenciasConfirmarAccionConector {
  registro: RegistroConectoresActivos;
  trace: RegistradorTrace;
}

export interface ParametrosConfirmarAccionConector {
  usuario: Usuario;
  plantId: string;
  conector: string;
  herramienta: string;
  parametros: Record<string, unknown>;
}

/**
 * El "click humano" que la spec 17 exige para toda escritura externa: solo
 * después de esta llamada se invoca de verdad el cliente MCP. No es parte
 * de un turno de chat, pero igual queda auditado en agent_trace (origen
 * conector-confirmacion/{nombre}) para no crear una tabla de auditoría
 * paralela a la que ya usan chat y rutinas.
 */
export async function confirmarAccionConector(
  deps: DependenciasConfirmarAccionConector,
  params: ParametrosConfirmarAccionConector,
): Promise<string> {
  const activo = deps.registro.obtener(params.conector);
  if (!activo) throw new ConectorDesconocido(params.conector);

  const existeEnManifiesto = activo.manifiesto.herramientas.some((h) => h.nombre === params.herramienta);
  if (!existeEnManifiesto) throw new ConectorDesconocido(params.conector);

  const rolesPermitidos = activo.permisos[params.herramienta];
  if (!rolesPermitidos || !rolesPermitidos.includes(params.usuario.rol)) throw new PermisoDenegado();

  const inicio = Date.now();
  try {
    const resultado = await activo.cliente.invocar(params.herramienta, params.parametros);
    await deps.trace.registrarTurno({
      plantId: params.plantId,
      usuarioId: params.usuario.id,
      origen: `conector-confirmacion/${params.conector}`,
      herramientasInvocadas: [{ nombre: params.herramienta, parametros: params.parametros, exitosa: true }],
      tokensEntrada: 0,
      tokensSalida: 0,
      costoUsd: 0,
      latenciaMs: Date.now() - inicio,
      exitoso: true,
    });
    return resultado;
  } catch (error) {
    await deps.trace.registrarTurno({
      plantId: params.plantId,
      usuarioId: params.usuario.id,
      origen: `conector-confirmacion/${params.conector}`,
      herramientasInvocadas: [{ nombre: params.herramienta, parametros: params.parametros, exitosa: false }],
      tokensEntrada: 0,
      tokensSalida: 0,
      costoUsd: 0,
      latenciaMs: Date.now() - inicio,
      exitoso: false,
    });
    throw error;
  }
}
