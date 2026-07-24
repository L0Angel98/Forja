# Feature: Conectores (MCP)

## Objetivo

Que Forja se extienda con conectores externos —Google Calendar y correo primero— sin modificar el núcleo, usando el estándar MCP.

## Diseño

- Un conector = un servidor MCP (proceso propio o in-process) + un **manifiesto**: `{ nombre, version, herramientas: [{ nombre, descripcion, schema, esEscritura }], permisosRequeridos }`.
- `workspace/conectores.yaml` declara conectores activos, su configuración (credenciales referidas por variable de entorno, nunca inline) y qué roles pueden usar cada herramienta.
- Al iniciar, una **Factory** lee el yaml, levanta los clientes MCP y registra sus herramientas en el Registry del runtime con el filtro de roles. Un conector caído se marca `no_disponible` y sus herramientas desaparecen del agente; el resto del sistema no se afecta.
- Toda herramienta con `esEscritura: true` hereda la regla global: el agente propone, la UI muestra la acción exacta (evento, fecha, invitados / destinatario, asunto) y el humano confirma con un click.

## Conectores de esta spec

**Google Calendar** (`crear_evento` [escritura], `consultar_disponibilidad` [lectura])
- Flujo objetivo: supervisor aprueba un borrador de mantenimiento → el agente propone el evento (título con máquina y falla, duración, técnicos como invitados) → supervisor confirma → evento creado y su id guardado en el registro correspondiente.
- OAuth de cuenta de servicio o cuenta dedicada de la planta; tokens cifrados en DB (age/libsodium), refresco automático.

**Correo SMTP** (`enviar_correo` [escritura]) — usado también como canal de salida de rutinas (spec 16).

**Webhook genérico** (`llamar_webhook` [escritura]) — URLs permitidas solo desde una lista blanca en `conectores.yaml`.

## Casos de uso

- Activar Google Calendar en el yaml (+ credenciales en env) → tras recarga del workspace, supervisores ven las herramientas nuevas.
- Crear evento confirmado → aparece en el calendario y el id queda vinculado en Forja.
- Token expirado/revocado → herramientas del conector en `no_disponible`, alerta al admin, cero impacto en el resto.
- Conector con manifiesto inválido → no se registra, error visible en admin.
- Desactivar un conector → sus herramientas desaparecen del agente en la siguiente recarga.

## Validaciones

- Manifiesto validado con Zod al cargar; colisión de nombres de herramienta entre conectores → rechazo con error claro.
- `conectores.yaml` no acepta secretos inline (lint del archivo al cargar: patrón de credencial detectado → rechazo).

## Seguridad

- Escrituras externas: confirmación humana obligatoria, sin excepción — incluidas las invocadas desde rutinas (que solo generan borradores).
- Auditoría: toda invocación de conector queda en `agent_trace` con conector, herramienta y resultado.
- Timeouts (10 s) y circuit breaker por conector: 5 fallos seguidos → `no_disponible` 5 min.

## Acceptance Criteria

- Con el conector de Calendar mockeado (servidor MCP de prueba): flujo aprobar → proponer → confirmar → evento creado, cubierto por test de integración.
- Un conector caído no afecta chat, reportes ni rutinas (test).
- Un operador nunca ve herramientas de escritura de conectores (test de contrato del registry).
- Manifiesto inválido y secreto inline en yaml: ambos rechazados con error visible (tests).
