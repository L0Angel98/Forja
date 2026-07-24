# Forja

Copiloto de IA para piso de planta en manufactura. Núcleo open source (Apache 2.0): reporte de fallas conversacional, consulta de documentación (RAG) y consulta de sensores en lenguaje natural.

Ver el plan de infraestructura, módulos y buenas prácticas en [`docs/plan.md`](docs/plan.md) y las specs de ingeniería en [`docs/specs/`](docs/specs/).

## Arranque rápido (instalación estándar)

Requiere Docker y Docker Compose.

```bash
git clone <url-del-repo> forja && cd forja
cp .env.example .env
cp -r workspace.example workspace   # opcional: contenido de ejemplo para soul.md/planta.md/conectores.yaml
docker compose up -d --build
```

Con eso: Postgres (TimescaleDB + pgvector) queda arriba, las migraciones se aplican automáticamente y — con `RUN_SEED=true` en `.env` (default) — el seed de desarrollo (1 planta, 2 áreas, 5 máquinas, 10 sensores, 7 días de lecturas sintéticas, 3 usuarios de prueba) se carga solo. La app queda disponible en `http://localhost` (Caddy).

`./workspace` se monta como volumen en `server` (`WORKSPACE_DIR`). Si el paso opcional de copiar `workspace.example/` se omite, el copiloto arranca con la personalidad y el contexto de planta por defecto (con una advertencia en `GET /api/admin/workspace`) hasta que un admin los edite desde ahí.

## Desarrollo del monorepo

```bash
corepack enable
pnpm install
pnpm lint          # eslint + reglas de arquitectura (eslint-plugin-boundaries)
pnpm typecheck
pnpm test          # unitarios
pnpm test:integration   # contra Postgres real (Testcontainers, requiere Docker)
```

## Estructura

Ver [`docs/specs/00-contexto.md`](docs/specs/00-contexto.md) para la arquitectura, el stack y las reglas de dependencia entre paquetes (`packages/core` es el dominio puro; `apps/server` es el composition root).

| App/paquete | Rol |
|---|---|
| `apps/server` | API HTTP (Fastify) + runtime del agente + pg-boss |
| `apps/web` | PWA de operador/supervisor (Next.js) |
| `apps/ingest` | Ingesta de sensores (MQTT/OPC UA → TimescaleDB) |
| `packages/db` | Esquema Drizzle, migraciones, seed |
| `packages/core`, `runtime`, `tools`, `rag`, `llm`, `connectors`, `scheduler`, `shared` | Dominio y capas de infraestructura (spec 10: estructura lista, casos de uso en specs 11-17) |
