import { obtenerSesionActual, type Rol } from "@forja/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ComposicionAuth } from "./composicion";
import { NOMBRE_COOKIE_SESION, opcionesCookieSesion } from "./cookie";
import "./tipos-fastify";

export function requiereSesion(auth: ComposicionAuth) {
  return async function preHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sesionId = request.cookies[NOMBRE_COOKIE_SESION];

    if (!sesionId) {
      await reply.status(401).send({ error: "sesion_invalida" });
      return;
    }

    try {
      const { usuario } = await obtenerSesionActual(
        { sesiones: auth.sesiones, usuarios: auth.usuarios },
        { sesionId, ahora: new Date() },
      );
      request.usuarioActual = usuario;
    } catch {
      reply.clearCookie(NOMBRE_COOKIE_SESION, opcionesCookieSesion());
      await reply.status(401).send({ error: "sesion_invalida" });
    }
  };
}

export function requiereRol(auth: ComposicionAuth, ...rolesPermitidos: Rol[]) {
  const conSesion = requiereSesion(auth);

  return async function preHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await conSesion(request, reply);
    if (reply.sent) return;

    if (!request.usuarioActual || !rolesPermitidos.includes(request.usuarioActual.rol)) {
      await reply.status(403).send({ error: "permiso_denegado" });
    }
  };
}
