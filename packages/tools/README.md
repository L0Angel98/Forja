# @forja/tools

Herramientas del agente (patrón Command): nombre, descripción, schema Zod, execute.

- `crearHerramientaProponerMemoria` (spec 12): disponible para los tres roles. El agente la invoca para dejar una entrada de memoria como sugerencia pendiente; el admin la aprueba o rechaza desde `/api/admin/memoria/sugerencias`.

> Las herramientas de producto (`crear_reporte_falla`, `consultar_sensores`, `buscar_documentos`, etc.) llegan en las specs 13-15.
