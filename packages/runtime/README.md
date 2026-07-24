# @forja/runtime

Loop del agente, registro de herramientas (Registry), workspace y políticas de ejecución.

- `RegistroHerramientas` (spec 11): Registry de herramientas filtrado por rol — `disponiblesPara(rol)`/`buscarDisponiblePara(nombre, rol)` solo exponen herramientas cuyo `rolesPermitidos` incluye ese rol.
- `ejecutarTurno` (spec 12, `loop-agente.ts`): loop del agente — entrada del usuario → LLM decide responder o invocar herramienta → valida parámetros con Zod → ejecuta → repite hasta 6 invocaciones o una respuesta final. Un parámetro inválido dispara una corrección; si vuelve a fallar, aborta el turno. Nunca lanza: si el `ProveedorLLM` falla, degrada con un mensaje y de todos modos registra el turno vía `RegistradorTrace` (100% de los turnos, éxito o fallo).
- `workspace/` (spec 12): `WorkspaceLoader` carga `soul.md`/`planta.md`/`memoria.md` (con defaults si faltan), detecta `rutinas/*.md` con frontmatter inválido sin tumbar el resto, y soporta hot reload (watcher con debounce configurable). `EscritorArchivosWorkspaceFs`/`EscritorMemoriaFs` implementan los puertos de `@forja/core` para editar el workspace y aprobar sugerencias de memoria.

> Los conectores MCP y las herramientas concretas del producto (`crear_reporte_falla`, `consultar_sensores`, etc.) llegan en las specs 13-17; aquí solo vive la infraestructura del loop y el Registry.
