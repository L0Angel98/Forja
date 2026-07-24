# Feature: Fundación del proyecto

## Objetivo

Dejar el monorepo, la base de datos, el CI y el despliegue local funcionando, de modo que cualquier feature posterior solo agregue código de dominio.

## Alcance

- Monorepo pnpm + Turborepo con la estructura de `00-contexto.md` (paquetes vacíos con su `package.json`, `tsconfig` compartido estricto y README).
- `docker-compose.yml`: postgres (con TimescaleDB y pgvector habilitados), server, web, ingest, caddy. `docker compose up` levanta todo.
- Esquema inicial Drizzle + migraciones: `plant`, `area`, `machine`, `machine_family`, `sensor`, `reading` (hypertable), `app_user`, `role`, `agent_trace`.
- pg-boss inicializado en `server`.
- CI (GitHub Actions): lint, typecheck, tests unitarios e integración (Testcontainers) en cada PR; build de imágenes y push a GHCR en tag.
- Seed de desarrollo: 1 planta, 2 áreas, 5 máquinas, 10 sensores, lecturas sintéticas de 7 días.

## Casos de uso (con test cada uno)

- Migraciones corren desde cero en un Postgres limpio.
- `reading` acepta 10k inserts por lote y consulta agregada por rango (test de integración).
- Seed idempotente: correrlo dos veces no duplica datos.

## Validaciones

- `sensor.unidad` y rangos min/max requeridos.
- FK estrictas: no hay sensores sin máquina ni máquinas sin área.

## Seguridad

- Contenedores non-root, imágenes distroless o alpine.
- `.env.example` documentado; el compose falla con mensaje claro si falta una variable.

## Acceptance Criteria

- De clon a stack corriendo con seed: ≤ 5 comandos documentados en el README raíz.
- CI en verde en el primer PR.
- `SELECT` agregado de lecturas de 7 días para un sensor responde < 200 ms con el seed.
