import fastifyCookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import type { ComposicionAuth } from "./auth/composicion";
import { registrarRutasAuth } from "./auth/rutas";

export interface DependenciasApp {
  auth: ComposicionAuth;
}

export function buildApp(deps: DependenciasApp): FastifyInstance {
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(fastifyCookie);

  app.get("/api/salud", async () => ({ estado: "ok" }));

  registrarRutasAuth(app, deps.auth);

  return app;
}
