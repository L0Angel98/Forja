# @forja/ingest

Proceso de ingesta (MQTT/OPC UA → TimescaleDB). Ciclo de vida independiente de `server` a propósito: no debe caerse si la API se reinicia.

> Spec 10 (fundación): el proceso arranca, verifica conexión a la base de datos y queda a la espera. Los conectores MQTT (Aedes) y OPC UA se implementan en la spec 15.
