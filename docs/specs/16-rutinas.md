# Feature: Rutinas programadas

## Objetivo

Que supervisores/admins definan tareas del agente que se ejecutan solas cada X tiempo (cron), con salida a un canal, sin capacidad de escribir nada por sí mismas.

## Formato (archivo en `workspace/rutinas/*.md`)

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
con más de un reporte y sensores mudos en el periodo.
```

## Casos de uso

- Al cargar el workspace, cada archivo válido registra/actualiza su job cron en pg-boss; `activa: false` lo desprograma.
- Ejecución: el scheduler corre el prompt con **solo** las herramientas listadas, bajo el rol declarado (siempre de solo lectura), y envía el resultado por el canal `salida`.
- Canales de salida = patrón **Strategy**: `correo:{grupo}`, `webhook:{url}`, `ui` (bandeja de resultados en la PWA). Agregar un canal nuevo no toca el scheduler.
- Presupuesto excedido a mitad de ejecución → se aborta, se entrega aviso parcial por el canal y se marca la ejecución como `excedida`.
- Dos ejecuciones no se traslapan: si la anterior sigue corriendo, la nueva se omite y se registra.
- CRUD de rutinas desde la UI (admin/supervisor) — la UI escribe el archivo .md; el archivo es la fuente de verdad.
- Si una rutina concluye que hay que actuar (p. ej. "programar mantenimiento"), genera un **borrador pendiente de aprobación**, jamás la acción directa.
- Historial por rutina: últimas N ejecuciones con estado, costo y salida.

## Validaciones

- Frontmatter validado con Zod: cron válido (parser real, no regex), herramientas existentes en el registry, canal conocido, presupuesto ≤ máximo global configurado.
- Frecuencia mínima permitida: cada 5 min.
- Rutina con herramienta de escritura en la lista → rechazada al cargar, error visible en admin.

## Seguridad

- Rol de rutina sin permisos de escritura por construcción (test de contrato del registry).
- Toda ejecución deja `agent_trace` con `origen: rutina/{nombre}`.
- Presupuesto mensual global de tokens por planta; las rutinas comparten ese tope y se pausan si se alcanza, con alerta.

## Acceptance Criteria

- Una rutina con cron `*/5 * * * *` ejecuta y entrega salida al canal `ui` (integración, cron acelerado en test).
- Editar el .md cambia el schedule sin reinicio.
- Rutina con herramienta de escritura no se registra y el error es visible (test).
- El tope de presupuesto por ejecución y el global se respetan (tests unitarios del scheduler con LLM mockeado).
