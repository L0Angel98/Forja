# Estándares de Ingeniería (aplican a todas las specs)

## TDD (obligatorio)

Ciclo por cada caso de uso: **rojo → verde → refactor.**

1. Escribe el test del caso de uso en `core` con dobles de los puertos (in-memory repos). Debe fallar.
2. Implementa lo mínimo para pasar.
3. Refactoriza con los tests en verde.

Pirámide de tests, en orden de prioridad:

- **Unitarios (core, tools):** casos de uso y validaciones. Rápidos, sin I/O. Son la mayoría.
- **Integración (db, ingest):** repositorios y queries contra Postgres real vía Testcontainers.
- **Evals del agente (runtime):** dataset en `evals/*.yaml` — entrada del usuario → herramienta esperada + parámetros esperados. Se afirma sobre la herramienta invocada, **nunca sobre el texto exacto** de la respuesta del LLM. Los evals corren con el LLM mockeado en CI y con LLM real bajo comando manual (`pnpm evals:live`).
- **E2E (web):** solo flujos críticos (login, crear reporte). Máximo 5–8 tests.

Prohibido: mockear lo que se está probando, tests que dependan del orden, `sleep` como sincronización.

## Clean code

- Funciones cortas, un nivel de abstracción por función.
- Nombres en español de dominio (`reporteFalla`, `crearOrdenTrabajo`) en `core`; inglés técnico en infraestructura.
- Errores de dominio tipados (`FallaNoEncontrada`, `PermisoDenegado`) en `shared/errors`; nunca `throw new Error(string)` en core.
- Sin comentarios que expliquen *qué* hace el código; solo *por qué* cuando no es obvio.
- Sin flags booleanos en firmas públicas — dos funciones o un objeto de opciones.

## SOLID aplicado a este proyecto (no teoría: estas son las reglas)

- **S:** un caso de uso = una clase/función en `core/use-cases`. `CrearReporteFalla` no notifica ni toma snapshots: emite un evento de dominio y otros reaccionan.
- **O:** nuevas herramientas del agente, conectores, estrategias de chunking y canales de salida de rutinas se agregan **registrándolos**, sin modificar el runtime (ver patrones Registry/Strategy abajo).
- **L:** toda implementación de un puerto debe pasar la misma suite de contrato: los tests de `RepositorioFallas` corren contra la versión in-memory y la de Drizzle.
- **I:** puertos pequeños. `LectorSensores` y `EscritorSensores` separados; una herramienta de solo lectura no recibe capacidades de escritura.
- **D:** `core` declara interfaces; la infraestructura las implementa; `apps/server` las conecta por constructor. Nada de contenedores de DI mágicos — inyección manual explícita en el composition root.

## Patrones de diseño autorizados (usar exactamente estos para estos problemas)

| Problema | Patrón | Dónde |
|---|---|---|
| Acceso a datos | **Repository** | Puertos en `core`, implementación Drizzle en `db` |
| Proveedores LLM intercambiables | **Adapter** | `packages/llm` sobre Vercel AI SDK |
| Herramientas del agente | **Command** — cada herramienta: `{ nombre, descripcion, schema (Zod), execute(params, ctx) }` | `packages/tools` |
| Alta de herramientas/conectores | **Registry + Factory** desde `conectores.yaml` y manifiestos | `runtime`, `connectors` |
| Chunking/retrieval variables | **Strategy** | `packages/rag` |
| Reacciones a hechos del dominio (falla creada → snapshot, notificación) | **Domain events** (Observer) — bus in-process síncrono en `core`, efectos en handlers | `core/events` |
| Ciclo de vida de reportes y órdenes (`borrador → confirmado → en_proceso → cerrado`) | **State** — transiciones válidas explícitas, transición inválida = error de dominio | `core/entities` |
| Canales de salida de rutinas (correo, webhook, UI) | **Strategy** | `scheduler` |

Cualquier otro patrón requiere ADR. La sobre-ingeniería es un bug: si el patrón no elimina un `if/else` repetido o una dependencia rígida real, no va.

## Definición de terminado (por feature)

1. Tests de todos los casos de uso de la spec, en verde.
2. Suite de contrato pasando para nuevos puertos.
3. Lint y typecheck limpios; sin `any`, sin `@ts-ignore`.
4. Migración Drizzle si cambió el esquema (nunca editar migraciones publicadas).
5. Criterios de aceptación de la spec verificables manualmente en la PWA o por API.
6. Textos en i18n; trazas del agente registradas si la feature toca el runtime.
