import type { Sesion } from "../entities/sesion";
import type { Usuario } from "../entities/usuario";
import { CredencialesInvalidas } from "../errors/credenciales-invalidas";
import { DemasiadosIntentos } from "../errors/demasiados-intentos";
import { UsuarioDesactivado } from "../errors/usuario-desactivado";
import type { HasherContrasenas } from "../ports/hasher-contrasenas";
import type { RegistradorAuditoria } from "../ports/registrador-auditoria";
import type { RepositorioIntentosLogin } from "../ports/repositorio-intentos-login";
import type { RepositorioSesiones } from "../ports/repositorio-sesiones";
import type { RepositorioUsuarios } from "../ports/repositorio-usuarios";
import { estaBloqueado, registrarFallo } from "../politica-bloqueo-login";

export interface DependenciasIniciarSesion {
  usuarios: RepositorioUsuarios;
  sesiones: RepositorioSesiones;
  hasher: HasherContrasenas;
  intentosLogin: RepositorioIntentosLogin;
  auditoria: RegistradorAuditoria;
  generarIdSesion: () => string;
}

export interface ParametrosIniciarSesion {
  email: string;
  contrasena: string;
  ip: string;
  dispositivoCompartido: boolean;
  ahora: Date;
}

export interface ResultadoIniciarSesion {
  usuario: Usuario;
  sesion: Sesion;
}

export async function iniciarSesion(
  deps: DependenciasIniciarSesion,
  params: ParametrosIniciarSesion,
): Promise<ResultadoIniciarSesion> {
  const { usuarios, sesiones, hasher, intentosLogin, auditoria, generarIdSesion } = deps;
  const { email, contrasena, ip, dispositivoCompartido, ahora } = params;

  const registroIntentos = await intentosLogin.obtener(ip, email);

  if (estaBloqueado(registroIntentos, ahora)) {
    await auditoria.registrar({ tipo: "login_demasiados_intentos", ip, email, ocurridoEn: ahora });
    throw new DemasiadosIntentos();
  }

  const usuario = await usuarios.buscarPorEmail(email);

  if (!usuario) {
    await intentosLogin.guardar(ip, email, registrarFallo(registroIntentos, ahora));
    await auditoria.registrar({ tipo: "login_fallido", ip, email, ocurridoEn: ahora });
    throw new CredencialesInvalidas();
  }

  if (!usuario.activo) {
    await auditoria.registrar({
      tipo: "login_usuario_desactivado",
      ip,
      email,
      usuarioId: usuario.id,
      ocurridoEn: ahora,
    });
    throw new UsuarioDesactivado();
  }

  const contrasenaValida = await hasher.verificar(usuario.passwordHash, contrasena);

  if (!contrasenaValida) {
    await intentosLogin.guardar(ip, email, registrarFallo(registroIntentos, ahora));
    await auditoria.registrar({
      tipo: "login_fallido",
      ip,
      email,
      usuarioId: usuario.id,
      ocurridoEn: ahora,
    });
    throw new CredencialesInvalidas();
  }

  await intentosLogin.eliminar(ip, email);

  const sesion: Sesion = {
    id: generarIdSesion(),
    usuarioId: usuario.id,
    dispositivoCompartido,
    creadaEn: ahora,
    ultimaActividadEn: ahora,
  };
  await sesiones.crear(sesion);
  await auditoria.registrar({ tipo: "login_exitoso", ip, email, usuarioId: usuario.id, ocurridoEn: ahora });

  return { usuario, sesion };
}
