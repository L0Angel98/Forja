# Feature: Ingesta de sensores y consulta en lenguaje natural

## Objetivo

Ingerir lecturas de sensores por MQTT hacia TimescaleDB y permitir consultarlas en lenguaje natural mediante herramientas de agregación seguras.

## Casos de uso — ingesta (`apps/ingest`)

- Broker MQTT embebido (Aedes) recibe en `forja/{plantId}/{sensorExternalId}` payload `{ ts, value }` → valida contra el catálogo de sensores → inserta por lotes (flush cada 1 s o 500 lecturas).
- Sensor desconocido → lectura a tabla `reading_quarantine` + contador visible en admin (no se descarta en silencio).
- Valor fuera del rango físico declarado del sensor → se guarda con flag `fuera_de_rango` (no se descarta: los valores anómalos son señal, no ruido).
- Reconexión del broker o de la DB con backoff; buffer en memoria acotado (config, default 50k lecturas) y métrica de lag expuesta.
- Sensor sin lecturas > X min (config por sensor) → estado "mudo" visible en admin y consultable por el agente.

## Casos de uso — consulta

- "¿Cómo estuvo la temperatura del horno 3 esta semana?" → herramienta `consultar_sensores` con `{ maquinaId, sensorId?, agregacion, rango }` → serie agregada + resumen del agente + mini-gráfica en la UI.
- Rango ambiguo ("últimamente") → el agente asume 7 días y lo dice explícitamente en la respuesta.
- Comparaciones simples: mismo sensor entre dos rangos.
- Pregunta que requiere escritura o datos crudos masivos → la herramienta no existe para eso; el agente explica el límite.

## Diseño

- **El LLM nunca genera SQL.** `consultar_sensores` acepta solo: agregaciones {min, max, avg, count, last}, bucket {5m, 1h, 1d}, rango máximo 90 días. Queries = plantillas parametrizadas Drizzle sobre continuous aggregates de Timescale.
- Respuestas de la herramienta acotadas a ≤ 500 puntos (re-bucketing automático si excede).

## API

- Ingesta: MQTT (sin HTTP).
- `GET /api/sensores/:id/lecturas?agg&bucket&desde&hasta` (misma plantilla que usa la herramienta; la UI la reutiliza para gráficas).

## Validaciones

- `ts` no más de 24 h en el futuro (relojes de PLC desajustados → cuarentena).
- Payloads no numéricos → cuarentena.

## Seguridad

- Broker con credenciales por dispositivo (usuario/contraseña por gateway); TLS opcional documentado.
- La herramienta filtra por máquinas del área del usuario (mismo mecanismo que spec 13/14).

## Acceptance Criteria

- Test de carga: 5k lecturas/s sostenidas 10 min sin pérdida (integración con Testcontainers + cliente MQTT).
- Caída de DB de 30 s durante ingesta → cero lecturas perdidas dentro del buffer (test).
- Evals: 12 preguntas de sensores → herramienta con agregación y rango correctos en ≥ 10; 3 preguntas que piden escritura/crudo → rechazo correcto en 3.
- El lag de ingesta es visible en `/api/salud` y en la UI de admin.
