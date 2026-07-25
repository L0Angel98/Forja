/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Offline de lectura (spec 02-interfaz): defaultCache ya cachea el shell
 * (HTML/RSC de páginas visitadas) y las respuestas GET de /api/* con
 * NetworkFirst — eso cubre "últimos reportes propios y documentos
 * consultados recientemente" sin tener que escribir esas estrategias a
 * mano. Las mutaciones (POST/PATCH) nunca se cachean: la regla de API
 * de defaultCache solo intercepta method: "GET".
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
