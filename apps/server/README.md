# @forja/server

API HTTP (Fastify) + runtime del agente. Único lugar donde se ensamblan implementaciones concretas (composition root).

- `src/app.ts` — instancia Fastify y rutas (capa HTTP pura, testeable con `.inject()`).
- `src/pgboss.ts` — arranque de pg-boss sobre el mismo Postgres.
- `src/main.ts` — entrypoint: arranca pg-boss y levanta el servidor HTTP.

## Comandos

```bash
pnpm --filter @forja/server dev     # desarrollo con recarga (tsx watch)
pnpm --filter @forja/server test    # unitarios
pnpm --filter @forja/server start   # producción (tsx, sin paso de bundling)
```
