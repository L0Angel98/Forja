import Fastify, { type FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/api/salud", async () => ({ estado: "ok" }));

  return app;
}
