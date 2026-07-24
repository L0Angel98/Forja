# Feature: Reporte de fallas conversacional

## Objetivo

Que un operador —incluso recién ingresado— reporte una falla completa y estructurada guiado por el agente, y que cada reporte quede vinculado a la ventana de datos de sensores previa al evento. **Esta es la feature núcleo: su registro estructurado es el futuro dataset de entrenamiento.**

## Casos de uso

- Operador describe una falla en texto libre → el agente identifica la máquina (o pregunta), mapea el síntoma a la **taxonomía cerrada**, pide severidad y evidencia opcional (foto), muestra resumen y pide confirmación → al confirmar, se crea el reporte.
- El operador corrige un dato en el resumen antes de confirmar.
- Máquina ambigua ("la prensa") → el agente ofrece las máquinas del área del operador para elegir.
- Síntoma fuera de taxonomía → se guarda en `sintoma_otro` (texto libre) y se marca para revisión del supervisor, quien puede promoverlo a la taxonomía.
- **Fallback sin LLM:** formulario tradicional con los mismos campos, siempre accesible desde la UI. El reporte resultante es indistinguible en DB del creado por el agente (campo `origen: agente | formulario`).
- Al crearse un reporte se emite el evento de dominio `FallaReportada`; handlers: (a) materializar `failure_sensor_snapshot` con las lecturas de los sensores de esa máquina en las N horas previas (default 4 h, configurable), (b) notificar a supervisores del área.
- Supervisor cambia el estado del reporte: `abierto → en_revision → atendido → cerrado` (patrón **State**; transiciones inválidas = error de dominio).

## UI

- Chat con streaming + botón permanente "Reportar con formulario".
- Tarjeta de resumen con botones Confirmar / Corregir antes de crear.
- Carga de foto desde cámara del dispositivo (tablets de piso).
- Lista de reportes con filtros por área, máquina, estado, severidad.

## API

- `POST /api/chat` (turno del agente, streaming)
- `POST /api/fallas` (formulario directo)
- `PATCH /api/fallas/:id/estado`
- `GET  /api/fallas?area&maquina&estado&severidad`

## Modelo de datos

- `failure_report`: machine_id, reportado_por, sintoma_taxonomia, sintoma_otro, descripcion, severidad (1–4), fotos[], origen, estado, timestamps.
- `failure_sensor_snapshot`: failure_report_id, sensor_id, ventana (tsrange), estadísticos materializados (min, max, avg, last) y referencia al rango crudo.

## Validaciones

- Máquina, síntoma (taxonomía u "otro"), severidad: obligatorios.
- La herramienta `crear_reporte_falla` **no ejecuta** sin `confirmado: true` proveniente de la UI — la confirmación es un click del usuario, nunca decisión del LLM.
- Fotos: máx 5, 10 MB c/u, solo imágenes.

## Seguridad

- El operador solo reporta sobre máquinas de sus áreas asignadas.
- El snapshot corre como job pg-boss con reintentos (3, backoff); si falla definitivamente, alerta a admin — un snapshot perdido es un dato de entrenamiento perdido.

## Acceptance Criteria

- Evals: 15 descripciones de falla de ejemplo → el agente invoca `crear_reporte_falla` con máquina y taxonomía correctas en ≥ 13.
- Con el LLM apagado, el flujo por formulario funciona completo.
- Todo reporte confirmado tiene su snapshot materializado o una alerta de fallo (test de integración con Testcontainers).
- Un operador no puede reportar sobre una máquina fuera de su área (test unitario del caso de uso).
