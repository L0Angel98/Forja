# Forja — Contexto del Proyecto (leer antes que cualquier spec)

## Qué es Forja

Copiloto de IA para piso de planta en manufactura. Permite a operadores reportar fallas de forma guiada, consultar documentación técnica (RAG) y consultar datos de sensores en lenguaje natural. Los supervisores revisan y aprueban todo lo que el agente propone. Open source (Apache 2.0) en su núcleo.

## Arquitectura (fija, no proponer alternativas)

- **Monolito modular.** 3 procesos: `server` (API + runtime del agente), `ingest` (MQTT/OPC UA → DB), `web` (PWA). Un solo Postgres.
- **Postgres 16 para todo:** relacional, series de tiempo (TimescaleDB), vectores (pgvector), colas y cron (pg-boss).
- **Deployment:** Docker Compose on-prem. Sin dependencias de servicios cloud en el núcleo, excepto la API del LLM (intercambiable por Ollama local).
- El LLM **nunca genera SQL ni ejecuta acciones directamente**: solo invoca herramientas tipadas con Zod. Las herramientas son la frontera de seguridad.
- Toda escritura propuesta por el agente queda como borrador que un humano confirma en la UI.

## Stack (fijo)

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript estricto (`strict: true`, sin `any`) |
| API | Fastify + Zod |
| Frontend | Next.js (App Router) como PWA |
| ORM | Drizzle |
| LLM | Vercel AI SDK (proveedor configurable) |
| Jobs/cron | pg-boss |
| Ingesta | MQTT (Aedes) primero; OPC UA (node-opcua) después |
| Tests | Vitest + Testcontainers (Postgres real en integración) |
| Monorepo | pnpm workspaces + Turborepo |

## Estructura del monorepo y reglas de dependencia

```
apps/server, apps/web, apps/ingest
packages/core        ← dominio puro: entidades, casos de uso, puertos. CERO imports de infra
packages/runtime     ← loop del agente, registro de herramientas
packages/tools       ← herramientas del agente (Command + Zod)
packages/rag         ← chunking, embeddings, retrieval
packages/llm         ← adaptador de proveedor LLM
packages/db          ← esquema Drizzle, migraciones, repositorios (implementan puertos de core)
packages/connectors  ← MQTT, OPC UA, Google Calendar, correo (servidores MCP)
packages/scheduler   ← rutinas programadas
packages/shared      ← esquemas Zod, tipos, errores, i18n
workspace.example/   ← soul.md, planta.md, memoria.md, rutinas/, conectores.yaml
```

Reglas (verificadas por `eslint-plugin-boundaries`, romperlas es fallo de CI):

1. `core` no importa de ningún otro paquete salvo `shared`.
2. `db`, `llm`, `connectors` implementan interfaces (puertos) declaradas en `core`. Nunca al revés.
3. `apps/server` es el único lugar donde se ensamblan implementaciones concretas (composition root, inyección por constructor).
4. Ningún paquete importa de `apps/*`.

## Reglas para la IA que programe esto

1. Lee `01-estandares.md` antes de escribir código. TDD es obligatorio: test primero, siempre.
2. Implementa las specs en orden numérico (10 → 17). Cada spec asume que las anteriores existen.
3. No agregues dependencias fuera del stack sin justificarlo en un ADR (`docs/adr/NNNN-titulo.md`).
4. No implementes funcionalidad no pedida en la spec. Si una spec es ambigua, elige la interpretación más simple y déjalo anotado en el PR.
5. Todo texto visible al usuario pasa por i18n (`packages/shared/i18n`), idioma base `es-MX`.
6. Cada feature termina con: tests en verde, lint limpio, migración (si aplica), y actualización del README del paquete tocado.
