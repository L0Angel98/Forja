# @forja/db

Esquema Drizzle, migraciones y repositorios sobre Postgres 16 + TimescaleDB + pgvector. Implementa los puertos que declara `@forja/core` (ninguno todavía; se agregan en specs posteriores).

## Tablas (spec 10 — fundación)

`plant`, `area`, `machine_family`, `machine`, `sensor`, `reading` (hypertable de Timescale por `ts`), `role`, `app_user`, `agent_trace`.

## Comandos

```bash
pnpm --filter @forja/db db:generate   # genera migraciones a partir del esquema
pnpm --filter @forja/db db:migrate    # aplica migraciones a DATABASE_URL
pnpm --filter @forja/db seed          # seed de desarrollo (idempotente)
pnpm --filter @forja/db test          # unitarios
pnpm --filter @forja/db test:integration  # contra Postgres real (Testcontainers)
```
