# @forja/db

Esquema Drizzle, migraciones y repositorios sobre Postgres 16 + TimescaleDB + pgvector. Implementa los puertos que declara `@forja/core`.

## Tablas

Spec 10 (fundación): `plant`, `area`, `machine_family`, `machine`, `sensor`, `reading` (hypertable de Timescale por `ts`), `role`, `app_user`, `agent_trace`.

Spec 11 (auth): `session`, `audit_log` (con columna `detalle` jsonb desde spec 12), `login_attempt`.

Spec 12 (workspace/runtime): `memory_suggestion`.

## Repositorios

Spec 11: `RepositorioUsuariosDrizzle`, `RepositorioSesionesDrizzle`, `RepositorioIntentosLoginDrizzle`, `RegistradorAuditoriaDrizzle`, `Argon2Hasher`. `RepositorioSesiones` tiene suite de contrato (`src/__tests__/contracts/`) que corre igual contra la versión en memoria y la de Drizzle.

Spec 12: `RepositorioSugerenciasMemoriaDrizzle`, `RegistradorTraceDrizzle` (escribe en `agent_trace`).

## Comandos

```bash
pnpm --filter @forja/db db:generate   # genera migraciones a partir del esquema
pnpm --filter @forja/db db:migrate    # aplica migraciones a DATABASE_URL
pnpm --filter @forja/db seed          # seed de desarrollo (idempotente)
pnpm --filter @forja/db test          # unitarios
pnpm --filter @forja/db test:integration  # contra Postgres real (Testcontainers)
```
