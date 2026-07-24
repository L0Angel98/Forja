import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import { MAXIMO_BYTES_DOCUMENTO } from "@forja/core";
import Fastify, { type FastifyInstance } from "fastify";
import type { ComposicionAuth } from "./auth/composicion";
import { registrarRutasAuth } from "./auth/rutas";
import { registrarRutasDocumentos } from "./documentos/rutas";
import type { ComposicionRuntime } from "./runtime/composicion";
import { registrarRutasRuntime } from "./runtime/rutas";
import { registrarRutasConectores } from "./conectores/rutas";
import { registrarRutasFallas } from "./fallas/rutas";
import { registrarRutasRutinas } from "./rutinas/rutas";
import { registrarRutasSensores } from "./sensores/rutas";

export interface DependenciasApp {
  auth: ComposicionAuth;
  runtime: ComposicionRuntime;
}

export function buildApp(deps: DependenciasApp): FastifyInstance {
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(fastifyCookie);
  app.register(fastifyMultipart, { limits: { fileSize: MAXIMO_BYTES_DOCUMENTO } });

  app.get("/api/salud", async () => {
    const ingesta = await deps.runtime.estadoIngesta.obtener();
    return { estado: "ok", ingesta };
  });

  registrarRutasAuth(app, deps.auth);
  registrarRutasRuntime(app, deps.auth, deps.runtime);
  registrarRutasFallas(app, deps.auth, deps.runtime);
  registrarRutasDocumentos(app, deps.auth, deps.runtime);
  registrarRutasSensores(app, deps.auth, deps.runtime);
  registrarRutasRutinas(app, deps.auth, deps.runtime);
  registrarRutasConectores(app, deps.auth, deps.runtime);

  return app;
}
