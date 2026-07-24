import { describe, expect, it } from "vitest";
import type { Usuario } from "@forja/core";
import { buildApp } from "../app";
import { NOMBRE_COOKIE_SESION } from "../auth/cookie";
import { crearComposicionAuthFalsa, crearComposicionRuntimeFalsa } from "./fakes";

const usuarioOperador: Usuario = {
  id: "usuario-1",
  email: "operador@planta.mx",
  passwordHash: "hash:correcta",
  nombre: "Operador",
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

function extraerCookie(setCookieHeader: string | string[] | undefined): string | undefined {
  const valor = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return valor?.split(";")[0];
}

describe("POST /api/auth/login", () => {
  it("credenciales correctas devuelven 200, el usuario y una cookie de sesión httpOnly", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioOperador.email, contrasena: "correcta" },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      usuario: {
        id: usuarioOperador.id,
        email: usuarioOperador.email,
        nombre: usuarioOperador.nombre,
        rol: usuarioOperador.rol,
      },
    });
    const cookie = respuesta.cookies.find((c) => c.name === NOMBRE_COOKIE_SESION);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
  });

  it("password incorrecta responde 401 genérico", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioOperador.email, contrasena: "mala" },
    });

    expect(respuesta.statusCode).toBe(401);
    expect(respuesta.json().error).toBe("CREDENCIALES_INVALIDAS");
  });

  it("usuario desactivado responde 401 con código específico", async () => {
    const auth = crearComposicionAuthFalsa([usuarioDesactivado]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioDesactivado.email, contrasena: "correcta" },
    });

    expect(respuesta.statusCode).toBe(401);
    expect(respuesta.json().error).toBe("USUARIO_DESACTIVADO");
  });

  it("tras 5 intentos fallidos responde 429 y queda auditado", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: usuarioOperador.email, contrasena: "mala" },
      });
    }

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioOperador.email, contrasena: "correcta" },
    });

    expect(respuesta.statusCode).toBe(429);
    expect(auth.auditoriaRepo.eventos.some((e) => e.tipo === "login_demasiados_intentos")).toBe(true);
  });

  it("cuerpo inválido responde 400", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "no-es-un-email" },
    });

    expect(respuesta.statusCode).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("sin cookie responde 401", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({ method: "GET", url: "/api/auth/me" });

    expect(respuesta.statusCode).toBe(401);
  });

  it("con sesión válida responde 200 con el usuario", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioOperador.email, contrasena: "correcta" },
    });
    const cookie = extraerCookie(login.headers["set-cookie"]);

    const respuesta = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie ?? "" },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().usuario.email).toBe(usuarioOperador.email);
  });

  it("un usuario desactivado tras iniciar sesión recibe 401 en la siguiente petición", async () => {
    const usuarioMutable = { ...usuarioOperador };
    const auth = crearComposicionAuthFalsa([usuarioMutable]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioMutable.email, contrasena: "correcta" },
    });
    const cookie = extraerCookie(login.headers["set-cookie"]);

    auth.usuariosRepo.usuarios.set(usuarioMutable.id, { ...usuarioMutable, activo: false });

    const respuesta = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie ?? "" },
    });

    expect(respuesta.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("revoca la sesión y limpia la cookie", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuarioOperador.email, contrasena: "correcta" },
    });
    const cookie = extraerCookie(login.headers["set-cookie"]);

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { cookie: cookie ?? "" },
    });
    expect(logout.statusCode).toBe(200);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie ?? "" },
    });
    expect(me.statusCode).toBe(401);
  });

  it("cerrar sesión sin cookie no falla", async () => {
    const auth = crearComposicionAuthFalsa([usuarioOperador]);
    const app = buildApp({ auth, runtime: crearComposicionRuntimeFalsa() });

    const respuesta = await app.inject({ method: "POST", url: "/api/auth/logout" });

    expect(respuesta.statusCode).toBe(200);
  });
});
