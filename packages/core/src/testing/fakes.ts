import type { Usuario } from "../entities/usuario";
import type { Sesion } from "../entities/sesion";
import type { RepositorioUsuarios } from "../ports/repositorio-usuarios";
import type { RepositorioSesiones } from "../ports/repositorio-sesiones";
import type { HasherContrasenas } from "../ports/hasher-contrasenas";
import type { RegistroIntentos, RepositorioIntentosLogin } from "../ports/repositorio-intentos-login";
import type { EventoAuditoria, RegistradorAuditoria } from "../ports/registrador-auditoria";
import type { SugerenciaMemoria } from "../entities/sugerencia-memoria";
import type { RepositorioSugerenciasMemoria } from "../ports/repositorio-sugerencias-memoria";
import type { EscritorMemoria } from "../ports/escritor-memoria";
import type { ArchivoWorkspaceEditable } from "../entities/workspace";
import type { EscritorArchivosWorkspace } from "../ports/escritor-archivos-workspace";
import type { TurnoAgente } from "../entities/turno-agente";
import type { RegistradorTrace } from "../ports/registrador-trace";
import type { ProveedorLLM, RespuestaProveedorLLM } from "../ports/proveedor-llm";

export function crearRepositorioUsuariosMemoria(usuariosIniciales: Usuario[] = []): RepositorioUsuarios & {
  usuarios: Map<string, Usuario>;
} {
  const usuarios = new Map(usuariosIniciales.map((u) => [u.id, u]));

  return {
    usuarios,
    async buscarPorEmail(email) {
      for (const usuario of usuarios.values()) {
        if (usuario.email === email) return usuario;
      }
      return null;
    },
    async buscarPorId(id) {
      return usuarios.get(id) ?? null;
    },
  };
}

export function crearRepositorioSesionesMemoria(): RepositorioSesiones & { sesiones: Map<string, Sesion> } {
  const sesiones = new Map<string, Sesion>();

  return {
    sesiones,
    async crear(sesion) {
      sesiones.set(sesion.id, sesion);
    },
    async buscarPorId(id) {
      return sesiones.get(id) ?? null;
    },
    async actualizarUltimaActividad(id, fecha) {
      const sesion = sesiones.get(id);
      if (sesion) sesiones.set(id, { ...sesion, ultimaActividadEn: fecha });
    },
    async eliminar(id) {
      sesiones.delete(id);
    },
  };
}

/** Hasher falso: el "hash" es el texto plano con un prefijo, suficiente para probar la lógica de casos de uso sin costo criptográfico real. */
export function crearHasherContrasenasFalso(): HasherContrasenas {
  return {
    async hash(contrasenaPlana) {
      return `hash:${contrasenaPlana}`;
    },
    async verificar(hash, contrasenaPlana) {
      return hash === `hash:${contrasenaPlana}`;
    },
  };
}

export function crearRepositorioIntentosLoginMemoria(): RepositorioIntentosLogin & {
  registros: Map<string, RegistroIntentos>;
} {
  const registros = new Map<string, RegistroIntentos>();
  const clave = (ip: string, email: string) => `${ip}:${email}`;

  return {
    registros,
    async obtener(ip, email) {
      return registros.get(clave(ip, email)) ?? null;
    },
    async guardar(ip, email, registro) {
      registros.set(clave(ip, email), registro);
    },
    async eliminar(ip, email) {
      registros.delete(clave(ip, email));
    },
  };
}

export function crearRegistradorAuditoriaMemoria(): RegistradorAuditoria & { eventos: EventoAuditoria[] } {
  const eventos: EventoAuditoria[] = [];
  return {
    eventos,
    async registrar(evento) {
      eventos.push(evento);
    },
  };
}

export function crearRepositorioSugerenciasMemoriaFalso(): RepositorioSugerenciasMemoria & {
  sugerencias: Map<string, SugerenciaMemoria>;
} {
  const sugerencias = new Map<string, SugerenciaMemoria>();
  return {
    sugerencias,
    async crear(sugerencia) {
      sugerencias.set(sugerencia.id, sugerencia);
    },
    async buscarPorId(id) {
      return sugerencias.get(id) ?? null;
    },
    async listarPendientes() {
      return [...sugerencias.values()].filter((s) => s.estado === "pendiente");
    },
    async actualizarEstado(id, estado) {
      const sugerencia = sugerencias.get(id);
      if (sugerencia) sugerencias.set(id, { ...sugerencia, estado });
    },
  };
}

export function crearEscritorMemoriaFalso(): EscritorMemoria & { entradas: string[] } {
  const entradas: string[] = [];
  return {
    entradas,
    async agregarEntrada(texto) {
      entradas.push(texto);
    },
  };
}

export function crearEscritorArchivosWorkspaceFalso(
  contenidoInicial: Partial<Record<ArchivoWorkspaceEditable, string>> = {},
): EscritorArchivosWorkspace & { archivos: Record<string, string> } {
  const archivos: Record<string, string> = { soul: "", planta: "", ...contenidoInicial };
  return {
    archivos,
    async leer(archivo) {
      return archivos[archivo] ?? "";
    },
    async escribir(archivo, contenido) {
      archivos[archivo] = contenido;
    },
  };
}

export function crearRegistradorTraceFalso(): RegistradorTrace & { turnos: TurnoAgente[] } {
  const turnos: TurnoAgente[] = [];
  return {
    turnos,
    async registrarTurno(turno) {
      turnos.push(turno);
    },
  };
}

/** Proveedor LLM falso: entrega respuestas guionadas en orden, una por llamada a `decidir`. */
export function crearProveedorLLMFalso(respuestas: RespuestaProveedorLLM[]): ProveedorLLM & { llamadas: number } {
  const estado = { llamadas: 0 };
  return {
    get llamadas() {
      return estado.llamadas;
    },
    async decidir() {
      const respuesta = respuestas[estado.llamadas];
      estado.llamadas += 1;
      if (!respuesta) {
        throw new Error("El proveedor LLM falso se quedó sin respuestas guionadas.");
      }
      return respuesta;
    },
  };
}
