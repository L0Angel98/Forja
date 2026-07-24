import {
  CredencialesInvalidas,
  DemasiadosIntentos,
  UsuarioDesactivado,
  cerrarSesion,
  iniciarSesion,
} from "@forja/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ComposicionAuth } from "./composicion";
import { NOMBRE_COOKIE_SESION, opcionesCookieSesion } from "./cookie";
import { requiereSesion } from "./middleware";

const cuerpoLogin = z.object({
  email: z.string().email(),
  contrasena: z.string().min(1),
  dispositivoCompartido: z.boolean().optional().default(false),
});

export function registrarRutasAuth(app: FastifyInstance, auth: ComposicionAuth): void {
  app.post("/api/auth/login", async (request, reply) => {
    const cuerpo = cuerpoLogin.safeParse(request.body);
    if (!cuerpo.success) {
      return reply.status(400).send({ error: "solicitud_invalida" });
    }

    try {
      const { usuario, sesion } = await iniciarSesion(auth, {
        email: cuerpo.data.email,
        contrasena: cuerpo.data.contrasena,
        dispositivoCompartido: cuerpo.data.dispositivoCompartido,
        ip: request.ip,
        ahora: new Date(),
      });

      reply.setCookie(NOMBRE_COOKIE_SESION, sesion.id, opcionesCookieSesion());
      return reply.status(200).send({
        usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
      });
    } catch (error) {
      if (error instanceof DemasiadosIntentos) {
        return reply.status(429).send({ error: error.codigo });
      }
      if (error instanceof UsuarioDesactivado) {
        return reply.status(401).send({ error: error.codigo });
      }
      if (error instanceof CredencialesInvalidas) {
        return reply.status(401).send({ error: error.codigo });
      }
      throw error;
    }
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const sesionId = request.cookies[NOMBRE_COOKIE_SESION];
    if (sesionId) {
      await cerrarSesion(auth, { sesionId, ip: request.ip, ahora: new Date() });
    }
    reply.clearCookie(NOMBRE_COOKIE_SESION, opcionesCookieSesion());
    return reply.status(200).send({ ok: true });
  });

  app.get("/api/auth/me", { preHandler: requiereSesion(auth) }, async (request, reply) => {
    const usuario = request.usuarioActual;
    if (!usuario) return reply.status(401).send({ error: "sesion_invalida" });
    return reply
      .status(200)
      .send({ usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol } });
  });
}
