import fastifyCookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import type { ComposicionAuth } from "./auth/composicion";
import { registrarRutasAuth } from "./auth/rutas";
import type { ComposicionRuntime } from "./runtime/composicion";
import { registrarRutasRuntime } from "./runtime/rutas";
import { registrarRutasFallas } from "./fallas/rutas";

export interface DependenciasApp {
  auth: ComposicionAuth;
  runtime: ComposicionRuntime;
}

export function buildApp(deps: DependenciasApp): FastifyInstance {
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(fastifyCookie);

  app.get("/api/salud", async () => ({ estado: "ok" }));

  registrarRutasAuth(app, deps.auth);
  registrarRutasRuntime(app, deps.auth, deps.runtime);
  registrarRutasFallas(app, deps.auth, deps.runtime);

  return app;
}
