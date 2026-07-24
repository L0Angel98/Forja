import { beforeEach, describe, expect, it } from "vitest";
import { iniciarSesion } from "../iniciar-sesion";
import { CredencialesInvalidas } from "../../errors/credenciales-invalidas";
import { UsuarioDesactivado } from "../../errors/usuario-desactivado";
import { DemasiadosIntentos } from "../../errors/demasiados-intentos";
import type { Usuario } from "../../entities/usuario";
import {
  crearHasherContrasenasFalso,
  crearRegistradorAuditoriaMemoria,
  crearRepositorioIntentosLoginMemoria,
  crearRepositorioSesionesMemoria,
  crearRepositorioUsuariosMemoria,
} from "../../testing/fakes";

const AHORA = new Date("2026-01-01T00:00:00.000Z");
const IP = "10.0.0.1";

const usuarioActivo: Usuario = {
  id: "usuario-1",
  email: "operador@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Operador de Prueba",
  rol: "operador",
  activo: true,
};

const usuarioDesactivado: Usuario = {
  id: "usuario-2",
  email: "baja@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Ex Empleado",
  rol: "operador",
  activo: false,
};

function construirDependencias(usuarios: Usuario[] = [usuarioActivo, usuarioDesactivado]) {
  return {
    usuarios: crearRepositorioUsuariosMemoria(usuarios),
    sesiones: crearRepositorioSesionesMemoria(),
    hasher: crearHasherContrasenasFalso(),
    intentosLogin: crearRepositorioIntentosLoginMemoria(),
    auditoria: crearRegistradorAuditoriaMemoria(),
    generarIdSesion: () => "sesion-generada",
  };
}

describe("iniciarSesion", () => {
  let deps: ReturnType<typeof construirDependencias>;

  beforeEach(() => {
    deps = construirDependencias();
  });

  it("login correcto crea una sesión y audita el éxito", async () => {
    const resultado = await iniciarSesion(deps, {
      email: usuarioActivo.email,
      contrasena: "correcta",
      ip: IP,
      dispositivoCompartido: false,
      ahora: AHORA,
    });

    expect(resultado.usuario.id).toBe(usuarioActivo.id);
    expect(resultado.sesion.id).toBe("sesion-generada");
    expect(deps.sesiones.sesiones.get("sesion-generada")).toBeDefined();
    expect(deps.auditoria.eventos).toContainEqual(
      expect.objectContaining({ tipo: "login_exitoso", usuarioId: usuarioActivo.id }),
    );
  });

  it("password incorrecta rechaza con error genérico", async () => {
    await expect(
      iniciarSesion(deps, {
        email: usuarioActivo.email,
        contrasena: "incorrecta",
        ip: IP,
        dispositivoCompartido: false,
        ahora: AHORA,
      }),
    ).rejects.toThrow(CredencialesInvalidas);
  });

  it("usuario inexistente rechaza con el mismo error genérico que password incorrecta", async () => {
    let errorPasswordIncorrecta: unknown;
    let errorUsuarioInexistente: unknown;

    try {
      await iniciarSesion(deps, {
        email: usuarioActivo.email,
        contrasena: "incorrecta",
        ip: IP,
        dispositivoCompartido: false,
        ahora: AHORA,
      });
    } catch (error) {
      errorPasswordIncorrecta = error;
    }

    try {
      await iniciarSesion(deps, {
        email: "no-existe@planta.mx",
        contrasena: "lo-que-sea",
        ip: IP,
        dispositivoCompartido: false,
        ahora: AHORA,
      });
    } catch (error) {
      errorUsuarioInexistente = error;
    }

    expect(errorPasswordIncorrecta).toBeInstanceOf(CredencialesInvalidas);
    expect(errorUsuarioInexistente).toBeInstanceOf(CredencialesInvalidas);
    expect((errorPasswordIncorrecta as Error).message).toBe((errorUsuarioInexistente as Error).message);
  });

  it("usuario desactivado rechaza con mensaje específico", async () => {
    await expect(
      iniciarSesion(deps, {
        email: usuarioDesactivado.email,
        contrasena: "correcta",
        ip: IP,
        dispositivoCompartido: false,
        ahora: AHORA,
      }),
    ).rejects.toThrow(UsuarioDesactivado);
  });

  it("bloquea tras 5 intentos fallidos en la ventana y lo audita", async () => {
    for (let i = 0; i < 5; i++) {
      await iniciarSesion(deps, {
        email: usuarioActivo.email,
        contrasena: "incorrecta",
        ip: IP,
        dispositivoCompartido: false,
        ahora: new Date(AHORA.getTime() + i * 1000),
      }).catch(() => undefined);
    }

    await expect(
      iniciarSesion(deps, {
        email: usuarioActivo.email,
        contrasena: "correcta",
        ip: IP,
        dispositivoCompartido: false,
        ahora: new Date(AHORA.getTime() + 6000),
      }),
    ).rejects.toThrow(DemasiadosIntentos);

    expect(deps.auditoria.eventos).toContainEqual(
      expect.objectContaining({ tipo: "login_demasiados_intentos" }),
    );
  });

  it("un login exitoso limpia el contador de intentos fallidos previos", async () => {
    await iniciarSesion(deps, {
      email: usuarioActivo.email,
      contrasena: "incorrecta",
      ip: IP,
      dispositivoCompartido: false,
      ahora: AHORA,
    }).catch(() => undefined);

    await iniciarSesion(deps, {
      email: usuarioActivo.email,
      contrasena: "correcta",
      ip: IP,
      dispositivoCompartido: false,
      ahora: new Date(AHORA.getTime() + 1000),
    });

    expect(deps.intentosLogin.registros.size).toBe(0);
  });
});
