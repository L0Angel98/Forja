# @forja/web

PWA de operador/supervisor/admin (Next.js App Router), construida sobre `@forja/ui` y `@forja/shared` (spec 02-interfaz).

## Shells por rol

- `app/(operador)/` — shell táctil de pantalla completa: `/chat`, `/reportar`, `/mis-reportes`, navegación inferior (3 destinos).
- `app/(supervisor)/` — shell de escritorio: `/bandeja` (fallas abiertas), `/maquinas`, navegación lateral.
- `app/(admin)/` — shell de escritorio: `/documentos`, `/conectores`, `/rutinas`, `/workspace`, navegación lateral.

`/` redirige según el rol de la sesión activa (`GET /api/auth/me`); sin sesión, redirige a `/iniciar-sesion`. Cada shell está protegido por `<GuardiaRol>`: un rol distinto al esperado redirige a la sección del rol real, nunca renderiza la navegación ajena.

`/maquinas`, `/conectores`, `/rutinas` y `/workspace` son placeholders honestos (`EstadoVacio` "Próximamente"): sus endpoints de listado/edición todavía no existen o quedaron fuera de alcance de esta iteración.

## Desarrollo local

`apps/server` y `next dev` usan el mismo puerto por defecto (3000); `pnpm dev` en este paquete corre en el puerto 3100 y usa `rewrites()` en `next.config.mjs` (`FORJA_API_ORIGIN`, por defecto `http://localhost:3000`) para proxyear `/api/*` al server. En producción, Caddy ya enruta ambos por el mismo origen (`docker/Caddyfile`), así que el rewrite es un no-op ahí.
