# @forja/server

API HTTP (Fastify) + runtime del agente. Único lugar donde se ensamblan implementaciones concretas (composition root).

- `src/app.ts` — instancia Fastify y rutas (capa HTTP pura, testeable con `.inject()`).
- `src/pgboss.ts` — arranque de pg-boss sobre el mismo Postgres.
- `src/main.ts` — entrypoint: arranca pg-boss y levanta el servidor HTTP.
- `src/auth/` (spec 11) — `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Sesiones con cookie httpOnly + tabla `session` en Postgres (sin JWT). `composicion.ts` ensambla los repositorios Drizzle + Argon2Hasher con los casos de uso de `@forja/core`. `middleware.ts` expone `requiereSesion`/`requiereRol(...roles)` reutilizables por rutas futuras.
- `src/runtime/` (spec 12) — `GET/PUT /api/admin/workspace/:archivo` (editar `soul.md`/`planta.md` con auditoría+diff), `GET /api/admin/memoria/sugerencias` + `POST .../aprobar|rechazar`. `composicion.ts` levanta el `WorkspaceLoader` (hot reload) y registra las herramientas del agente (`RegistroHerramientas`) al boot. `WORKSPACE_DIR` (env, default `./workspace`) es el directorio del workspace.

El loop del agente (`ejecutarTurno`, `@forja/runtime`) y el adaptador de LLM (`@forja/llm`) ya están listos para usarse; la ruta pública de chat (`POST /api/chat`) llega en la spec 13 junto con el reporte de fallas.

## Comandos

```bash
pnpm --filter @forja/server dev     # desarrollo con recarga (tsx watch)
pnpm --filter @forja/server test    # unitarios
pnpm --filter @forja/server start   # producción (tsx, sin paso de bundling)
```
