import type { Usuario } from "../entities/usuario";
import type { Sesion } from "../entities/sesion";
import type { RepositorioUsuarios } from "../ports/repositorio-usuarios";
import type { RepositorioSesiones } from "../ports/repositorio-sesiones";
import type { HasherContrasenas } from "../ports/hasher-contrasenas";
import type { RegistroIntentos, RepositorioIntentosLogin } from "../ports/repositorio-intentos-login";
import type { EventoAuditoria, RegistradorAuditoria } from "../ports/registrador-auditoria";

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
