# Feature: Workspace del agente y runtime

## Objetivo

Que el comportamiento del copiloto se configure con archivos Markdown en un directorio `workspace/` (patrón OpenClaw) y que exista el loop de agente que ejecuta herramientas tipadas.

## Estructura del workspace

```
workspace/
├── soul.md          # Personalidad, tono, idioma, límites
├── planta.md        # Contexto local: turnos, áreas, jerga
├── memoria.md       # Memoria curada; el agente propone, el admin aprueba
├── rutinas/*.md     # Ver spec 16
└── conectores.yaml  # Ver spec 17
```

## Casos de uso

- Al iniciar, el runtime carga `soul.md` + `planta.md` al system prompt; si faltan, usa defaults incluidos en el paquete y lo registra como warning.
- Hot reload: editar un archivo del workspace recarga la configuración sin reiniciar (watcher con debounce 2 s).
- Admin edita `soul.md` desde la UI → se guarda con registro de auditoría (usuario, timestamp, diff).
- El agente propone una entrada de memoria → se agrega a una cola de sugerencias; el admin la aprueba y se escribe en `memoria.md`, o la rechaza.
- Archivo malformado (frontmatter inválido en rutinas, YAML roto) → se ignora ese archivo, se registra error visible en la UI de admin, el resto del workspace sigue funcionando.

## Runtime del agente (loop)

- Entrada del usuario → contexto (system prompt + memoria + historial de la conversación) → el LLM decide: responder o invocar herramienta.
- Herramienta = patrón **Command**: `{ nombre, descripcion, schema Zod, execute(params, ctx) }`. `ctx` incluye usuario, rol, plantId y trace.
- El **Registry** de herramientas filtra por rol antes de exponerlas al LLM.
- Máximo 6 invocaciones de herramienta por turno; al exceder, el agente responde con lo que tenga y lo registra.
- Streaming de la respuesta a la UI.
- Cada turno escribe en `agent_trace`: herramientas llamadas, parámetros, tokens, costo, latencia.
- Si el proveedor LLM no responde (timeout 30 s / error), la UI ofrece el flujo manual correspondiente (degradación, ver spec 13).

## Validaciones

- `soul.md` y `planta.md`: tamaño máximo 20 KB cada uno (presupuesto de contexto).
- Solo rol admin puede escribir en el workspace (UI y API).

## Seguridad

- Los archivos del workspace son configuración confiable pero auditada: todo cambio queda con diff.
- Los parámetros de toda herramienta se validan con Zod **antes** de ejecutar; parámetros inválidos regresan el error al LLM una sola vez para corrección, luego se aborta el turno.

## Acceptance Criteria

- Editar `soul.md` cambia el comportamiento en la siguiente conversación sin reinicio (test de integración).
- Un archivo de rutina malformado no tumba el runtime y aparece en la UI de admin.
- `agent_trace` registra el 100% de los turnos, incluidos los fallidos.
- Evals: 10 entradas de control verifican que el registro filtra herramientas por rol.
