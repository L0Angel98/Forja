# @forja/ingest

Proceso de ingesta (MQTT/OPC UA → TimescaleDB). Ciclo de vida independiente de `server` a propósito: no debe caerse si la API se reinicia.

## Spec 15: broker MQTT

- Broker Aedes embebido (`node:net` + `aedes.handle`), tópico `forja/{plantId}/{sensorExternalId}`, payload `{ ts, value }`.
- Catálogo de sensores cacheado en memoria (`CacheCatalogoSensores`), refrescado cada `INGEST_REFRESCO_CATALOGO_MS` (default 30 s) — nunca una consulta a la DB por mensaje.
- Lecturas y cuarentena se acumulan en buffers acotados (`BufferCircular`, default 50k, drop-oldest) y se vuelcan a la DB cada `INGEST_FLUSH_INTERVALO_MS` (1 s) o al alcanzar `INGEST_FLUSH_MAX_LECTURAS` (500), lo que ocurra primero.
- Si el flush falla (DB caída), el lote vuelve al frente del buffer y el `programador-flush` reintenta con backoff exponencial (`INGEST_BACKOFF_INICIAL_MS` → `INGEST_BACKOFF_MAXIMO_MS`): cero pérdida mientras el buffer no se llene.
- Cada flush exitoso persiste `lagMs`/`bufferSize` en `ingest_status` (fila singleton), que `/api/salud` en `apps/server` expone — `apps/ingest` no expone HTTP propio.
- Autenticación por dispositivo/gateway vía `MQTT_DEVICE_CREDENTIALS` (JSON `{ "usuario": "password" }`); sin definir, el broker acepta conexiones sin auth (solo dev/local). TLS se configura a nivel de infraestructura (fuera de alcance de este paquete).

Los conectores OPC UA quedan fuera de alcance de la spec 15.
