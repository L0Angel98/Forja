# @forja/web

PWA de operador/supervisor/admin (Next.js App Router), construida sobre `@forja/ui` y `@forja/shared` (spec 02-interfaz).

## Shells por rol

- `app/(operador)/` — shell táctil de pantalla completa: `/chat`, `/reportar`, `/mis-reportes`, navegación inferior (3 destinos).
- `app/(supervisor)/` — shell de escritorio: `/bandeja` (fallas abiertas), `/maquinas`, navegación lateral.
- `app/(admin)/` — shell de escritorio: `/documentos`, `/conectores`, `/rutinas`, `/workspace`, navegación lateral.

`/` redirige según el rol de la sesión activa (`GET /api/auth/me`); sin sesión, redirige a `/iniciar-sesion`. Cada shell está protegido por `<GuardiaRol>`: un rol distinto al esperado redirige a la sección del rol real, nunca renderiza la navegación ajena.

`/maquinas`, `/conectores`, `/rutinas` y `/workspace` son placeholders honestos (`EstadoVacio` "Próximamente"): sus endpoints de listado/edición todavía no existen o quedaron fuera de alcance de esta iteración.

## PWA

- Instalable (`app/manifest.ts` → `/manifest.webmanifest`, `display: standalone`). Íconos en `public/icon.svg` / `public/icon-maskable.svg` — monograma placeholder, pendiente de reemplazo por un diseñador.
- Service worker con [Serwist](https://serwist.pages.dev/) (`app/sw.ts`, generado a `public/sw.js` en build — no se versiona). Solo activo en producción (`disable` en dev evita contenido obsoleto durante desarrollo activo). Usa el `defaultCache` de `@serwist/next/worker`: cachea el shell (HTML/RSC de páginas visitadas) y las respuestas GET de `/api/*` con NetworkFirst — cubre "offline de lectura: shell, últimos reportes propios y documentos consultados recientemente". Las mutaciones (POST/PATCH) nunca se cachean.
- Offline de escritura — **solo el formulario de Reportar** (`lib/cola-offline.ts` + `lib/usar-cola-offline.ts`): si `POST /api/fallas` falla por falta de red, el reporte se guarda en IndexedDB y se muestra como pendiente; al reconectar (evento `online`) se reintenta con backoff exponencial (2s → 60s) sin recargar la página. El chat (`lib/usar-en-linea.ts`) no funciona offline y lo dice explícitamente en vez de fallar en silencio — no tiene ningún mecanismo de cola.

## Accesibilidad, E2E y Lighthouse

- `e2e/` — Playwright. `playwright.config.ts` levanta apps/server y apps/web (build de producción, para que el service worker y el rendimiento se comporten como en real) vía `webServer`. Requiere una Postgres real migrada y sembrada (ver el job `e2e` en `.github/workflows/ci.yml`) — usa los usuarios de desarrollo de `packages/db/src/seed.ts`.
  - `accesibilidad.spec.ts` — `@axe-core/playwright` en cada pantalla de cada rol; cero violaciones `critical`/`serious` (spec: "bloquea merge").
  - `enrutamiento-por-rol.spec.ts` — los dos casos de uso explícitos de la spec (operador→chat sin nav de admin, supervisor→bandeja) + que un operador no puede navegar manualmente a una ruta de admin.
  - `chat-degradado.spec.ts` — sin `ANTHROPIC_API_KEY` en CI (a propósito, no hay presupuesto de LLM real para E2E), el server ya degrada `/api/chat` a `exitoso: false`; se verifica que el chat lo muestre como un banner, no en silencio.
  - `reportar-offline.spec.ts` — sin conexión, el reporte se guarda en IndexedDB y se muestra como pendiente. El "sin conexión" se simula forzando el `fetch` de `POST /api/fallas` a rechazar (`page.addInitScript`) en vez de `context.setOffline`: con el service worker de producción activo, `context.setOffline` deja el POST sin llegar al server pero el banner de pendiente tampoco aparecía en CI real — la emulación de red a nivel CDP no resolvía de forma fiable con el fetch hecho desde ese contexto. No cubre el reenvío exitoso al reconectar: no hay catálogo de máquinas por HTTP hoy, así que el tag de máquina usado en el test no es un id real y el reenvío fallaría con 404 aun en línea.
  - `zoom-reportar.spec.ts` — aproxima 200% de zoom con un viewport reducido; verifica cero scroll horizontal.
  - `pwa.spec.ts` — el manifest expone los campos mínimos de instalabilidad y el service worker llega a registrarse.
  - No cubre "cambio de idioma persiste entre sesiones": hoy solo existe el locale es-MX (spec: "por ahora"), así que no hay un segundo idioma real al que cambiar.
- `lighthouserc.cjs` + `lighthouse-login.cjs` — Lighthouse CI contra `/chat` ya autenticado (`puppeteerScript` hace login antes de auditar), con `formFactor: mobile` y throttling que imita 4G, aproximando "vista de operador, tablet, 4G simulada". Umbrales: rendimiento ≥ 0.85, accesibilidad ≥ 0.95. La categoría "pwa" de Lighthouse (y sus auditorías de instalabilidad) se eliminó en Lighthouse 10+ — ausente en la versión que empaqueta `@lhci/cli` aquí (12.6.1) — por eso "PWA instalable" se verifica con Playwright (`e2e/pwa.spec.ts`) en vez de con Lighthouse.

## Desarrollo local

`apps/server` y `next dev` usan el mismo puerto por defecto (3000); `pnpm dev` en este paquete corre en el puerto 3100 y usa `rewrites()` en `next.config.mjs` (`FORJA_API_ORIGIN`, por defecto `http://localhost:3000`) para proxyear `/api/*` al server. En producción, Caddy ya enruta ambos por el mismo origen (`docker/Caddyfile`), así que el rewrite es un no-op ahí.
