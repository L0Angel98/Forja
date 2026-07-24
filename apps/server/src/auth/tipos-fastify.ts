import type { Usuario } from "@forja/core";

declare module "fastify" {
  interface FastifyRequest {
    usuarioActual?: Usuario;
  }
}
