# Forja — Plan de Infraestructura, Módulos y Buenas Prácticas

**Versión:** 0.2 · **Estado:** Plan de ejecución
**Modelo:** Open core (núcleo Apache 2.0 + módulos comerciales)
**Producto:** Copiloto de IA para piso de planta en manufactura

---

## 1. Contexto y supuestos

Este plan asume las decisiones ya tomadas:

- Forja es un **producto** (copiloto de planta), no una plataforma genérica de agentes.
- Fase 1: asistente (reporte de fallas, búsqueda de información, consulta de sensores). Fase 2: módulos de ML predictivo con supervisor humano que valida y agenda.
- El reporte estructurado de fallas de la Fase 1 genera el dataset de entrenamiento de la Fase 2 (flywheel).
- Núcleo de uso libre bajo Apache 2.0; módulos predictivos, conectores premium y soporte son comerciales.
- Un solo desarrollador con ~10–15 hrs/semana. Toda decisión técnica prioriza mantenibilidad sobre sofisticación.

## 2. Requisitos

**Funcionales (núcleo libre)**

1. Reporte de fallas conversacional: el agente guía al operador (máquina, síntoma, severidad, evidencia foto) y produce un registro estructurado.
2. Consulta de documentación: RAG sobre manuales, SOPs y procedimientos de la planta.
3. Consulta de sensores en lenguaje natural sobre datos de series de tiempo.
4. Ingesta de datos de sensores vía MQTT y OPC UA.
5. Administración: máquinas, áreas, usuarios, roles, carga de documentos.

**Funcionales (comercial)**

6. Detección de anomalías y predicción de fallas por familia de máquina.
7. Generación de borradores de órdenes de mantenimiento preventivo con sugerencia de refacciones, flujo de aprobación por supervisor.
8. Conectores premium: SAP PM, historians propietarios, CMMS de terceros.
9. Multi-planta, SSO/SAML, reportes ejecutivos.

**No funcionales**

- **Deployment on-prem primero.** Todo el núcleo debe correr en un solo servidor de planta sin salida a internet, excepto la llamada al LLM si la planta lo permite (ver §7 para la alternativa).
- Latencia de respuesta del asistente < 5 s percibidos (streaming).
- El sistema debe degradarse con gracia: si el LLM no responde, el reporte de fallas funciona como formulario tradicional.
- Datos de la planta nunca salen del perímetro salvo el texto mínimo enviado al proveedor de LLM, configurable y auditable.

**Restricciones**

- 1 desarrollador, TypeScript como lenguaje principal (Python solo para ML en Fase 2).
- Presupuesto de infraestructura propio ≈ 0: la planta pone el servidor; tú solo pagas el sitio de docs y CI.

## 3. Arquitectura de alto nivel

```
                    PLANTA (on-prem)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Sensores/PLCs ──MQTT/OPC UA──► forja-ingest        │
│                                      │              │
│                                      ▼              │
│                            TimescaleDB (Postgres)   │
│                            + pgvector + tablas app  │
│                                      ▲              │
│  Operador ──web/PWA──► forja-app ────┤              │
│  Supervisor           (API + agente) │              │
│                            │         │              │
│                            ▼         │              │
│                      forja-runtime ──┘              │
│                      (orquestación de agente,       │
│                       herramientas MCP, RAG)        │
│                            │                        │
└────────────────────────────┼────────────────────────┘
                             ▼ (única salida, opcional)
                      Proveedor LLM (API)
                      o LLM local (Ollama/vLLM)
```

**Flujo de datos principal (reporte de falla):**
operador escribe → runtime clasifica intención → herramienta `crear_reporte_falla` guía el llenado → registro en Postgres con vínculo a la máquina y snapshot de sensores de las últimas N horas → notificación al supervisor. Ese vínculo registro-falla ↔ ventana-de-sensores es la fila de entrenamiento futura; diséñalo desde el día 1.

**Decisión clave: monolito modular, no microservicios.** Un solo proceso Node para API + runtime del agente, un proceso aparte para ingesta (porque tiene ciclo de vida distinto y no debe caerse si la app se reinicia), y Postgres. Tres contenedores. Con tu tiempo disponible, cada servicio adicional es deuda operativa; los límites de módulo se imponen en el código (ver §4), no en la red.

## 4. Módulos (estructura del monorepo)

Monorepo con pnpm workspaces + Turborepo. La línea libre/comercial se traza a nivel de paquete y de repositorio: el monorepo público contiene solo lo Apache 2.0; lo comercial vive en un repo privado que consume los paquetes públicos.

```
forja/  (público, Apache 2.0)
├── apps/
│   ├── server/          # API HTTP (Fastify) + runtime del agente
│   ├── web/             # PWA operador/supervisor (Next.js)
│   └── ingest/          # Ingesta MQTT/OPC UA → TimescaleDB
├── packages/
│   ├── core/            # Dominio: entidades, casos de uso, puertos (cero deps de infra)
│   ├── runtime/         # Loop del agente, registro de herramientas, políticas
│   ├── tools/           # Herramientas MCP: fallas, sensores, documentos
│   ├── rag/             # Chunking, embeddings, retrieval sobre pgvector
│   ├── llm/             # Adaptador de proveedor (Vercel AI SDK), presupuestos y reintentos
│   ├── db/              # Esquema (Drizzle), migraciones, repositorios
│   ├── connectors/      # MQTT, OPC UA (interfaces + implementaciones base)
│   ├── scheduler/       # Rutinas programadas (cron sobre pg-boss, ver §4.3)
│   └── shared/          # Esquemas Zod, tipos, errores, i18n
├── workspace.example/   # Workspace de agente de ejemplo (ver §4.1)
└── docs/                # Docusaurus/Starlight

forja-pro/  (privado, comercial)
├── packages/
│   ├── predict/         # Modelos ML (Python, empaquetado como servicio)
│   ├── workflow/        # Órdenes de mantenimiento, aprobaciones, agenda
│   ├── connectors-pro/  # SAP PM, historians, CMMS
│   └── enterprise/      # SSO, multi-planta, auditoría avanzada
```

Reglas de dependencia (Clean Architecture aplicada, que ya dominas): `core` no importa nada de infra; `tools` y `rag` dependen de puertos definidos en `core`; `server` es el único que ensambla. Refuérzalo con `eslint-plugin-boundaries` para que la regla no dependa de disciplina.

**Sobre el runtime del agente:** no construyas orquestación genérica. Un loop simple —intención → herramienta → respuesta— con herramientas tipadas (Zod) cubre la Fase 1 completa. Expón las herramientas también como servidor MCP (experiencia que ya tienes de Failtrack) para que plantas con Claude u otros clientes las reutilicen: eso te da adopción gratis del núcleo.

### 4.1 Workspace del agente (archivos .md)

Siguiendo el patrón de OpenClaw (SOUL.md, AGENTS.md, MEMORY.md), la personalidad y el contexto del copiloto viven en archivos Markdown editables, no en código. Un directorio `workspace/` montado como volumen:

```
workspace/
├── soul.md          # Personalidad, tono, idioma, límites del copiloto
├── planta.md        # Contexto local: turnos, áreas, jerga, reglas de la planta
├── memoria.md       # Memoria persistente curada, editable por el admin
├── rutinas/         # Una rutina programada = un archivo .md (ver §4.3)
│   └── resumen-diario.md
└── conectores.yaml  # Conectores habilitados y sus permisos (ver §4.2)
```

Reglas de diseño:

- **Hot reload:** el runtime observa el directorio y recarga sin reiniciar; `soul.md` y `planta.md` se inyectan al system prompt.
- **Solo el rol admin edita** (vía UI o directamente en disco). Los archivos son configuración confiable, pero cada cambio se audita: quién, cuándo, diff — porque quien edita `soul.md` controla al agente.
- **Versionable en git por la planta:** los cambios de comportamiento del copiloto quedan como diffs revisables, no como clicks perdidos en una UI. Esto es oro para plantas con procesos de cambio controlado.
- La memoria que el propio agente proponga guardar se escribe como sugerencia pendiente en `memoria.md`; el admin aprueba. Coherente con el principio human-in-the-loop de todo el sistema.

### 4.2 Conectores como servidores MCP

Un conector = un servidor MCP con un manifiesto (nombre, herramientas que expone, permisos que requiere). Esto reutiliza el estándar en vez de inventar un sistema de plugins propio, y permite que terceros escriban conectores sin tocar el núcleo — la palanca de comunidad más barata que tienes.

- **Núcleo libre:** MQTT, OPC UA, y conectores de productividad: **Google Calendar** (agendar mantenimientos aprobados), correo/SMTP, webhooks genéricos.
- **Comerciales:** SAP PM, historians propietarios, CMMS de terceros.
- `conectores.yaml` declara qué conectores están activos y qué roles pueden usar cada herramienta; el runtime filtra las herramientas visibles para el agente según el rol del usuario en sesión.
- **Escrituras externas siempre confirmadas:** crear un evento en Calendar o enviar un correo pasa por confirmación del usuario/supervisor en la UI, igual que las escrituras internas (§8). El agente propone, el humano dispara.

### 4.3 Rutinas programadas

pg-boss ya incluye scheduling con expresiones cron — cero infraestructura nueva. Una rutina es un archivo `.md` en `workspace/rutinas/` con frontmatter YAML:

```markdown
---
nombre: resumen-diario
cron: "0 6 * * *"
rol: supervisor-lectura
herramientas: [consultar_fallas, consultar_sensores]
salida: correo:supervisores
presupuesto_tokens: 20000
activa: true
---
Resume las fallas de las últimas 24 horas por área, señala máquinas
con más de un reporte y sensores sin lecturas en el periodo.
```

El usuario define el cron; el scheduler registra el job, ejecuta el prompt con las herramientas permitidas y entrega el resultado por el canal de salida. Ejemplos naturales: resumen diario a las 6 a.m., revisión semanal de tendencias de sensores, verificación cada hora de sensores mudos.

Guardrails no negociables:

1. Cada rutina corre con un **rol propio** de solo lectura por defecto.
2. **Presupuesto de tokens por rutina** — un cron mal configurado no puede quemar el presupuesto mensual de la planta.
3. Toda ejecución deja traza en `agent_trace` (§10), con costo y latencia.
4. Una rutina **nunca ejecuta escrituras**: si concluye "hay que agendar mantenimiento", genera un borrador pendiente de aprobación. Automatización sin supervisión humana en una planta es exactamente lo que hace que te saquen de la planta.

## 5. Stack y trade-offs

| Capa | Elección | Trade-off aceptado |
|---|---|---|
| API | Fastify + Zod | Menos ecosistema que Nest; a cambio, sin magia y arranque rápido |
| Frontend | Next.js (PWA) | Ya lo dominas; PWA evita apps nativas para tablets de piso |
| ORM/DB | Drizzle + Postgres 16 | Un solo motor para todo (abajo) |
| Series de tiempo | TimescaleDB (extensión) | Menos potente que un historian dedicado; suficiente para < ~50k lecturas/min por planta |
| Vectores | pgvector | Peor recall a >10M chunks que un motor dedicado; una planta no llega ahí |
| LLM | Vercel AI SDK (multi-proveedor) + opción Ollama/vLLM local | Modelos locales responden peor; es el precio de plantas sin salida a internet |
| Ingesta | MQTT (Aedes o Mosquitto) + node-opcua | OPC UA es complejo; empieza por MQTT y agrega OPC UA con el primer piloto que lo exija |
| Colas/jobs | pg-boss (sobre Postgres) | Menos throughput que BullMQ/Redis; elimina Redis del stack, un servicio menos que operar |
| ML (Fase 2) | Python + scikit-learn/XGBoost, servido con FastAPI en su contenedor | Nada de deep learning hasta que los datos lo justifiquen |
| Contenedores | Docker Compose (instalación estándar); K3s solo si el cliente lo pide | Compose no auto-recupera nodos; una planta con un servidor no lo necesita |

El principio transversal: **Postgres hace de base relacional, time-series, vectorial y cola de trabajos.** Un backup, un servicio que monitorear, una cosa que puede fallar a las 3 a.m. en una planta donde tú no estás.

## 6. Modelo de datos (núcleo)

Entidades mínimas y sus relaciones:

- `plant` → `area` → `machine` (con `machine_family` para agrupar modelos ML futuros)
- `sensor` (pertenece a `machine`; metadatos: unidad, rango, protocolo)
- `reading` (hypertable Timescale: sensor_id, ts, value)
- `failure_report` (machine_id, reportado_por, síntoma estructurado + texto libre, severidad, estado, fotos)
- `failure_sensor_snapshot` (failure_report_id → referencia a la ventana de lecturas previa al evento; materializada, no calculada al vuelo)
- `document` / `document_chunk` (chunk con embedding, metadatos de máquina/área para filtrar retrieval)
- `work_order` (comercial: borrador del agente, aprobación, agenda, refacciones sugeridas)
- `agent_trace` (cada conversación: herramientas llamadas, tokens, costo, latencia — ver §10)

Práctica clave: los síntomas de falla se capturan con **taxonomía cerrada + texto libre**, no solo texto libre. Sin taxonomía no hay etiquetas de entrenamiento; el agente es quien mapea la descripción del operador a la taxonomía y pide confirmación.

## 7. Infraestructura y deployment

**Instalación estándar (núcleo libre):** un `docker-compose.yml` con 4 contenedores (server, web, ingest, postgres) + Caddy como reverse proxy con TLS. Objetivo medible: de servidor limpio a Forja funcionando en **menos de 30 minutos** siguiendo el README. Ese número es tu métrica de adopción más importante como proyecto OSS.

**Modos de conectividad LLM:**

1. **Híbrido (default):** todo on-prem, única salida HTTPS al proveedor de LLM. Documenta exactamente qué texto sale (prompt + chunks recuperados) para el equipo de seguridad OT.
2. **Air-gapped:** Ollama/vLLM en el mismo servidor con un modelo abierto. Menor calidad; funcionalmente completo.

**Red OT:** Forja vive en la DMZ industrial o en la red IT, nunca dentro de la red de control. Los datos suben de OT→IT vía el broker MQTT en un solo sentido (patrón estándar ISA-95/Purdue); Forja jamás escribe hacia PLCs. Ponlo explícito en la documentación: es la primera pregunta que hará cualquier ingeniero de planta.

**Tu propia infra (mínima):** GitHub (repo, Actions, Releases con imágenes en GHCR), docs en Cloudflare Pages/GitHub Pages, un dominio. Costo < $20 USD/mes.

## 8. Seguridad

- **Autenticación:** sesiones + RBAC simple (operador, supervisor, admin) en el núcleo; SSO es comercial. No inventes crypto: usa Lucia/Auth.js.
- **Guardrails del agente:** las herramientas son la frontera de seguridad. El LLM nunca genera SQL; llama herramientas con parámetros validados por Zod y las queries son plantillas parametrizadas. Lecturas de sensores: solo agregaciones permitidas sobre máquinas a las que el rol tiene acceso.
- **Prompt injection vía documentos:** los manuales cargados son entrada no confiable. El retrieval marca los chunks como datos, y las herramientas de escritura (crear reporte) siempre requieren confirmación explícita del usuario en la UI, nunca se ejecutan solo por decisión del modelo.
- **Secrets:** variables de entorno + `.env` cifrado con SOPS/age en el repo de despliegue del cliente. Nada de secrets en imágenes.
- **Supply chain (crítico en OSS):** lockfile estricto, Dependabot, `pnpm audit` en CI, imágenes firmadas (cosign) y SBOM (syft) en cada release. Las plantas grandes lo van a pedir; tenerlo desde el inicio es diferenciador.

## 9. Buenas prácticas de ingeniería

- **CI/CD:** GitHub Actions — lint, typecheck, tests, build de imágenes en cada PR; release por tag con changesets (versionado semver + changelog automático).
- **Tests, priorizados por riesgo:** (1) herramientas del agente — tests unitarios exhaustivos de validación y de las queries que generan; (2) evals del agente — un set de ~30–50 conversaciones esperadas (reportar falla, consultar sensor, pregunta de manual) corridas contra el runtime con asserts sobre la herramienta llamada y sus parámetros, no sobre el texto exacto; (3) integración de ingesta con testcontainers. Cobertura de UI: mínima, no es donde está el riesgo.
- **Migraciones:** siempre hacia adelante, nunca editar migraciones publicadas — hay instalaciones que no controlas.
- **ADRs:** una decisión = un archivo en `docs/adr/`. Con un solo desarrollador, los ADRs son tu memoria; con comunidad, son tu forma de decir "esto ya se discutió".
- **Convenciones:** conventional commits, ESLint + Prettier estrictos en CI, `CODEOWNERS` aunque seas solo tú (prepara el terreno).
- **i18n desde el día 1:** es-MX primero, inglés después. Retrofitear i18n cuesta 5–10× más que incluirlo al inicio.

## 10. Observabilidad

- **Trazas del agente:** cada conversación registra herramientas invocadas, tokens, costo y latencia en `agent_trace` (OpenTelemetry con exportador a Postgres; Langfuse self-hosted como opción documentada para quien quiera UI dedicada).
- **Métricas de producto que importan:** reportes de falla creados/semana, % de reportes vía agente vs. formulario manual, consultas de documentos con respuesta útil (thumbs up/down en la UI). Estas tres te dicen si el producto vive o muere en el piso.
- **Salud del sistema:** healthchecks por contenedor, lag de ingesta MQTT (lecturas encoladas), y alerta local por correo si la ingesta se detiene > 5 min — en una planta, ingesta caída = agujero en el dataset de entrenamiento.

## 11. Gobernanza open source

- **Licencias:** núcleo Apache 2.0 (concesión de patentes incluida — relevante en industrial). Repo comercial privado. La línea libre/comercial publicada en el README desde el commit 1; no se mueve hacia comercial después.
- **Sin CLA al inicio;** usa DCO (`Signed-off-by`), fricción mínima para contribuir.
- **Archivos base:** LICENSE, CONTRIBUTING (cómo correr el proyecto local en < 15 min), CODE_OF_CONDUCT, SECURITY.md (correo para reportes de vulnerabilidades), roadmap público en GitHub Projects.
- **Expectativa realista:** planea como si nadie fuera a contribuir. Las contribuciones llegan, si llegan, después de que el proyecto es útil — no lo hacen útil.
- **Marca:** registra el dominio y verifica disponibilidad de la marca "Forja" en software (hay colisiones probables por ser palabra común); el nombre del binario/paquete npm importa más que el logo.

## 12. Roadmap (a 10–15 hrs/semana)

| Fase | Alcance | Estimación |
|---|---|---|
| **0 — Fundación** | Monorepo, CI, esquema DB, auth, docker-compose instalable | 4–6 semanas |
| **1a — Reporte de fallas** | Herramienta conversacional + formulario fallback + snapshot de sensores | 6–8 semanas |
| **1b — RAG documentos** | Carga, chunking, retrieval filtrado por máquina, citas a la fuente | 4–6 semanas |
| **1c — Sensores en lenguaje natural** | Ingesta MQTT + herramientas de consulta agregada | 6–8 semanas |
| **1d — Workspace, rutinas y conectores** | Archivos .md del agente con hot reload, scheduler de rutinas, conectores Google Calendar y correo | 4–6 semanas |
| **Piloto** | 1 planta real usando 1a–1d; instrumentar métricas de §10 | 8–12 semanas de operación |
| **2 — Predictivo (comercial)** | Anomalías por familia de máquina → borradores de orden con aprobación | Solo cuando el piloto tenga ≥ 3–6 meses de fallas etiquetadas |

Total realista hasta piloto operando: **10–14 meses calendario.** Si una fase se puede recortar, recorta 1c o los conectores de 1d antes que 1a: el reporte de fallas es el flywheel; sensores en lenguaje natural y Calendar son conveniencia. El workspace de archivos .md sí conviene tenerlo desde la fase 0 — es barato y define cómo se configura todo lo demás.

## 13. Riesgos y qué revisar al crecer

1. **Riesgo #1 — adopción en piso, no tecnología:** si los operadores no reportan vía Forja, no hay dataset y no hay Fase 2. Mitigación: el fallback de formulario debe ser *mejor* que su proceso actual en papel/Excel aun sin IA.
2. **Cold start del ML:** sin 6–12 meses de fallas etiquetadas por familia de máquina, los modelos predictivos no son honestos. No vendas predicción antes de tener los datos; vende el asistente.
3. **Dependencia del proveedor LLM:** presupuestos de tokens por planta/mes configurables y modo degradado sin LLM, para que un cambio de precios no rompa tu modelo de costos.
4. **Tu tiempo:** con TEC.sites e Ilo activos, Forja compite por tus mismas 10–15 hrs. Si el piloto no aparece al terminar 1a, esa es la señal para pausar y validar demanda antes de construir 1b–1c.

**Revisar cuando crezca:** pg-boss → cola dedicada si superas ~100 jobs/s; pgvector → motor dedicado si superas millones de chunks; Compose → K3s cuando haya un cliente multi-servidor; monolito → extraer `ingest` a escalado independiente si una planta supera ~50k lecturas/min.
